import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export const arquivos = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ password: z.string().min(1).max(128),
    action: z.enum(['listar','pasta','upload','registrar','baixar','compartilhar','excluir']),
    espaco: z.string().uuid().optional(), pasta: z.string().uuid().nullable().optional(), id: z.string().uuid().optional(),
    nome: z.string().trim().max(200).optional(), caminho: z.string().max(500).optional(), tamanho: z.number().int().min(0).max(20*1024*1024).optional(),
    documento: z.string().uuid().optional(), acessos: z.array(z.string().uuid()).max(100).optional(),
  }).parse(value)).handler(async ({ data, context }) => {
    const { data: active } = await context.supabase.rpc('conta_ativa', { _uid: context.userId });
    const { data: user } = await context.supabase.auth.getUser();
    if (!active || !user.user?.email) throw new Error('Conta indisponível.');
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env['SUPABASE_URL']; const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) throw new Error('Serviço indisponível.');
    const verifier = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>{
      const headers=new Headers(init?.headers); if(key.startsWith('sb_')&&headers.get('Authorization')===`Bearer ${key}`)headers.delete('Authorization');
      headers.set('apikey',key);return fetch(input,{...init,headers});
    }}});
    const { data: verified,error: authError } = await verifier.auth.signInWithPassword({email:user.user.email,password:data.password});
    if(authError || verified.user?.id!==context.userId)throw new Error('Senha incorreta.');
    await verifier.auth.signOut();
    const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
    const { data: own,error: ownError }=await admin.from('arquivo_espacos').upsert({dono_id:context.userId},{onConflict:'dono_id'}).select().single();
    if(ownError || !own)throw new Error('Não foi possível abrir Arquivos.');
    const {data: spaces}=await admin.from('arquivo_espacos').select().or(`dono_id.eq.${context.userId},acessos.cs.{${context.userId}}`);
    const space=(spaces??[]).find(s=>s.id===(data.espaco??own.id));
    if(!space)throw new Error('Acesso não autorizado.');
    const owner=space.dono_id===context.userId;
    if(data.action!=='listar'&&data.action!=='baixar'&&!owner)throw new Error('Somente o setor responsável pode alterar arquivos.');
    if(data.pasta){const {data:folder}=await admin.from('arquivo_pastas').select('id').eq('id',data.pasta).eq('espaco_id',space.id).maybeSingle();if(!folder)throw new Error('Pasta indisponível.');}
    if(data.action==='pasta'){
      if(!data.nome)throw new Error('Informe o nome da pasta.');
      const {error}=await admin.from('arquivo_pastas').insert({espaco_id:space.id,pai_id:data.pasta??null,nome:data.nome});if(error)throw new Error('Não foi possível criar pasta.');
    }
    if(data.action==='compartilhar'){
      const ids=Array.from(new Set(data.acessos??[]));
      const {data:accounts}=await admin.from('paineis').select('user_id').in('user_id',ids).eq('ativo',true);
      if(ids.some(id=>!accounts?.some(p=>p.user_id===id)))throw new Error('Conta indisponível.');
      const {error}=await admin.from('arquivo_espacos').update({acessos:ids}).eq('id',space.id);if(error)throw new Error('Não foi possível compartilhar.');
      space.acessos=ids;
    }
    if(data.action==='upload'){
      const path=`${space.id}/${crypto.randomUUID()}.pdf`;
      const {data:upload,error}=await admin.storage.from('arquivos-seii').createSignedUploadUrl(path);
      if(error||!upload)throw new Error('Não foi possível preparar o envio.');
      return {upload:{path,token:upload.token},url:null,owner,space,spaces:[],folders:[],items:[],panels:[],documents:[]};
    }
    if(data.action==='registrar'){
      if(!data.nome||!data.caminho||!new RegExp(`^${space.id}/[a-f0-9-]+\\.pdf$`).test(data.caminho))throw new Error('Arquivo inválido.');
      const {data:objects,error:objectError}=await admin.storage.from('arquivos-seii').list(space.id,{search:data.caminho.split('/')[1]??''});
      const object=objects?.find(o=>`${space.id}/${o.name}`===data.caminho);
      if(objectError||!object||object.metadata?.mimetype!=='application/pdf')throw new Error('PDF não encontrado.');
      let version:number|null=null;
      if(data.documento){const {data:doc}=await context.supabase.from('documentos').select('versao,criado_por,status').eq('id',data.documento).single();if(!doc||doc.criado_por!==context.userId)throw new Error('Documento indisponível.');version=doc.versao;}
      const {error}=await admin.from('arquivo_itens').insert({espaco_id:space.id,pasta_id:data.pasta??null,nome:data.nome,caminho:data.caminho,tamanho:object.metadata?.size??data.tamanho??0,documento_id:data.documento??null,versao:version});if(error)throw new Error('Não foi possível registrar o PDF.');
    }
    if(data.action==='baixar'||data.action==='excluir'){
      const {data:item}=await admin.from('arquivo_itens').select().eq('id',data.id??'').eq('espaco_id',space.id).single();if(!item)throw new Error('Arquivo indisponível.');
      if(data.action==='baixar'){const {data:download,error}=await admin.storage.from('arquivos-seii').createSignedUrl(item.caminho,60);if(error||!download)throw new Error('Não foi possível baixar.');return {url:download.signedUrl,upload:null,owner,space,spaces:[],folders:[],items:[],panels:[],documents:[]};}
      const {error}=await admin.storage.from('arquivos-seii').remove([item.caminho]);if(error)throw new Error('Não foi possível excluir.');await admin.from('arquivo_itens').delete().eq('id',item.id);
    }
    const [folders,items,panels,documents]=await Promise.all([
      admin.from('arquivo_pastas').select().eq('espaco_id',space.id).order('nome'),
      admin.from('arquivo_itens').select().eq('espaco_id',space.id).order('nome'),
      admin.from('paineis').select('user_id,nome,setor,tipo_painel').eq('ativo',true),
      context.supabase.from('documentos').select('id,dados,versao,status').eq('criado_por',context.userId),
    ]);
    if(folders.error||items.error)throw new Error('Não foi possível listar os arquivos.');
    return {space,owner,spaces:spaces??[],folders:folders.data??[],items:items.data??[],panels:panels.data??[],documents:documents.data??[],upload:null,url:null};
  });