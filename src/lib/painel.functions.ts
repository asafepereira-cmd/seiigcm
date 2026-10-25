import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { ordenarPainel, solicitacoesDoUsuario } from './painel';

export const getPainel = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({context}) => {
  const {data: roles,error: roleError} = await context.supabase.from('user_roles').select('role');
  if (roleError) throw new Error('Não foi possível conferir seu acesso.');
  const admin = roles?.some(r => r.role === 'admin') ?? false;
  const [{data: docs,error},{data: requests,error: requestError},{data: funcoes}] = await Promise.all([
    context.supabase.from('documentos').select('id,tipo,numero,ano,assunto,prioridade,prazo,status,analise_admin,enviado_analise_em,dados'),
    context.supabase.from('solicitacoes_assinatura').select('id,documento_id,gestora,signatario_nome,assinado_em,aberto_em,em_analise_em'),
    context.supabase.from('funcoes_predefinidas').select('id,nome').order('nome'),
  ]);
  if(error || requestError) throw new Error('Não foi possível carregar o painel.');
  const proprias = solicitacoesDoUsuario(requests ?? [], (roles ?? []).map(r => r.role), context.userId);
  return {admin,roles: roles ?? [],docs: ordenarPainel(docs ?? []),requests: admin ? requests ?? [] : proprias,minhas: proprias,funcoes: funcoes ?? []};
});

export const criarGestora = createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
.inputValidator((d:unknown) => z.object({email:z.string().trim().min(1).max(320),password:z.string().min(8).max(128),role:z.enum(['pedagogica','administrativa','emissor']),nome:z.string().trim().max(200).optional(),funcao:z.string().trim().max(200).optional(),tipo_painel:z.enum(['individual','setor']).default('individual'),setor:z.string().trim().max(200).default(''),responsavel:z.string().trim().max(200).default('')}).refine(v=>v.role!=='emissor'||(v.tipo_painel==='setor'?v.setor.length>2:(v.nome&&v.funcao)),'Informe nome e função.').parse(d))
.handler(async ({data,context}) => {
  const {data: admin,error} = await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
  if(error || !admin) throw new Error('Acesso restrito.');
  const {supabaseAdmin} = await import('@/integrations/supabase/client.server');
  const {data: existing,error: lookupError} = await supabaseAdmin.from('user_roles').select('id').eq('role',data.role);
  if(lookupError) throw new Error('Não foi possível conferir os acessos.');
  if(data.role!=='emissor' && existing?.length) throw new Error('Esta gestora já possui um acesso.');
  const {data: user,error: createError} = await supabaseAdmin.auth.admin.createUser({email:data.email,password:data.password,email_confirm:true});
  if(createError || !user.user) throw new Error(createError?.code === 'email_address_invalid' ? 'O serviço de acesso exige um endereço de e-mail válido, mesmo sem a validação de formato no cadastro.' : 'Não foi possível criar o acesso. O endereço pode já estar cadastrado ou não ser aceito pelo serviço de acesso.');
  const {error: roleError} = await supabaseAdmin.from('user_roles').insert({user_id:user.user.id,role:data.role});
  const {error: painelError} = data.role==='emissor' ? await supabaseAdmin.from('paineis').insert({user_id:user.user.id,nome:data.tipo_painel==='setor'?data.setor:(data.nome??''),funcao:data.tipo_painel==='setor'?'Setor':(data.funcao??''),tipo_painel:data.tipo_painel,setor:data.setor,responsavel:data.responsavel}) : {error:null};
  if(roleError || painelError) { await supabaseAdmin.auth.admin.deleteUser(user.user.id); throw new Error('Não foi possível atribuir o acesso.'); }
  return {ok:true};
});

export const getAssignedRequest = createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
.inputValidator((d:unknown)=>z.object({id:z.string().uuid()}).parse(d)).handler(async({data,context})=>{
  const {data:r,error}=await context.supabase.from('solicitacoes_assinatura').select('token').eq('id',data.id).single();
  if(error || !r) throw new Error('Solicitação não disponível.');
  const {error: aberturaError} = await context.supabase.rpc('marcar_analise',{_id:data.id});
  if(aberturaError) throw new Error('Não foi possível registrar a abertura.');
  return {token:r.token};
});
