import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { corrigirNome } from './document-identity';
import { podeAssinarComoEmissor } from './document-access';
import { cpfValido } from './sector';
import { GESTORAS } from './documento';
import { exigeIdentificacaoAssinatura, gestoraDaConta } from './signature-identity';
import type { Documento } from './documento';
import type { ExtrasPDF } from './assinaturas-eletronicas';
const tokenInput = z.object({ token: z.string().min(20).max(100) });
export const signAuthorDocument = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), password: z.string().min(1).max(128), nome: z.string().max(200).optional(), funcao: z.string().max(200).optional(), cpf: z.string().max(20).optional(), concordo: z.literal(true) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase.from('documentos').select('criado_por,dados').eq('id', data.id).single();
    if (!doc) throw new Error('Documento indisponível.');
    const { data: allowed } = await context.supabase.rpc('permissao_painel', { _uid: context.userId, _acao: 'assinar' });
    if (!podeAssinarComoEmissor(context.userId,doc.criado_por,!!allowed)) throw new Error('Você precisa ser o autor e ter permissão para assinar.');
    const { data: panel } = await context.supabase.from('paineis').select('tipo_painel,nome,funcao').eq('user_id',context.userId).maybeSingle();
    const { data: roles } = await context.supabase.from('user_roles').select('role').eq('user_id',context.userId);
    const manager = gestoraDaConta('', (roles ?? []).map(r => r.role));
    const manual = panel?.tipo_painel === 'setor' && !manager;
    if (manual && (!data.nome?.trim() || !data.funcao?.trim() || !cpfValido(data.cpf ?? ''))) throw new Error('Informe nome completo, função e CPF válido.');
    const { data: account } = await context.supabase.auth.getUser();
    const email = account.user?.email;
    const url = process.env['SUPABASE_URL']; const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!email || !url || !key) throw new Error('Não foi possível conferir a conta.');
    const { createClient } = await import('@supabase/supabase-js');
    const verifier = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey',key); return fetch(input,{ ...init,headers });
    } } });
    const { data: signed, error } = await verifier.auth.signInWithPassword({ email,password:data.password });
    if (error || signed.user?.id !== context.userId) throw new Error('Senha da conta incorreta.');
    await verifier.auth.signOut({ scope:'local' });
    const document = doc.dados as unknown as Documento;
    const identity = manager ? GESTORAS[manager] : null;
    const nome = corrigirNome(manual ? data.nome ?? '' : identity?.nome ?? panel?.nome ?? document.assinante);
    const funcao = manual ? data.funcao ?? '' : identity?.cargo ?? panel?.funcao ?? document.cargo;
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error: saveError } = await supabaseAdmin.rpc('assinar_documento_autor',{ _id:data.id,_autor:context.userId,_nome:nome,_funcao:funcao,_cpf:data.cpf ?? '' });
    if (saveError) throw new Error('Não foi possível assinar: esta versão pode já estar assinada.');
    return { ok:true };
  });
export const getSignRequest = createServerFn({ method: 'POST' }).inputValidator((d: unknown) => tokenInput.parse(d)).handler(async ({ data }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: req } = await supabaseAdmin.from('solicitacoes_assinatura').select('id,gestora,signatario_nome,signatario_funcao,termo,finalidade,decisao,observacoes,assinado_em,documento_id,versao').eq('token', data.token).maybeSingle();
  if (!req) return { found: false as const };
  const { data: doc } = await supabaseAdmin.from('documentos').select('dados,emitido_em,status,versao').eq('id', req.documento_id).maybeSingle();
  if (!doc || doc.versao !== req.versao) return { found: false as const };
  await supabaseAdmin.from('solicitacoes_assinatura').update({ aberto_em: new Date().toISOString() }).eq('id', req.id).is('aberto_em', null);
  const uid = req.gestora.startsWith('user:') ? req.gestora.slice(5) : null;
  const { data: panel } = uid ? await supabaseAdmin.from('paineis').select('tipo_painel').eq('user_id', uid).maybeSingle() : { data: null };
   const { data: roles } = uid ? await supabaseAdmin.from('user_roles').select('role').eq('user_id', uid) : { data: null };
   const accountRoles = (roles ?? []).map(r => r.role);
   const manager = gestoraDaConta(req.gestora, accountRoles);
   const identity = manager ? GESTORAS[manager] : null;
  const { data: requests } = await supabaseAdmin.from('solicitacoes_assinatura').select('gestora,signatario_nome,signatario_funcao,decisao,observacoes,assinado_em').eq('documento_id', req.documento_id).eq('versao', doc.versao);
  const { data: images } = await supabaseAdmin.from('assinaturas_gestoras').select('gestora,imagem');
  const imageMap = new Map((images ?? []).map(i => [i.gestora, i.imagem]));
  const extras: ExtrasPDF = { emitidoEm: doc.emitido_em, emissorImagem: imageMap.get('admin'), assinaturas: (requests ?? []).map(s => ({ gestora: s.gestora, nome: s.signatario_nome, cargo: s.signatario_funcao, decisao: s.decisao, observacoes: s.observacoes, assinadoEm: s.assinado_em, imagem: s.assinado_em ? imageMap.get(s.gestora) : undefined })) };
   return { found: true as const, documentoId: req.documento_id, setor: exigeIdentificacaoAssinatura(req.gestora, panel?.tipo_painel, accountRoles), exigeSenha: !req.gestora.startsWith('extra:'), finalidade: req.finalidade, gestora: req.gestora, nome: identity?.nome ?? req.signatario_nome, cargo: identity?.cargo ?? req.signatario_funcao, termo: req.termo, decisao: req.decisao, assinadoEm: req.assinado_em, completo: doc.status === 'assinado', doc: doc.dados as unknown as Documento, extras };
});
export const signDocument = createServerFn({ method: 'POST' }).inputValidator((d: unknown) => tokenInput.extend({ decisao: z.enum(['deferido','indeferido','ciente']), observacoes: z.string().max(600), concordo: z.literal(true), nome: z.string().max(200).optional(), funcao: z.string().max(200).optional(), cpf: z.string().max(20).optional(), password: z.string().max(128).optional() }).parse(d)).handler(async ({ data }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: req } = await supabaseAdmin.from('solicitacoes_assinatura').select('gestora,assinado_em').eq('token', data.token).maybeSingle();
  if (!req || req.assinado_em) throw new Error('Solicitação indisponível.');
  const uid = req.gestora.startsWith('user:') ? req.gestora.slice(5) : null;
  const { data: panel } = uid ? await supabaseAdmin.from('paineis').select('tipo_painel,ativo').eq('user_id', uid).maybeSingle() : { data: null };
   const { data: roles } = uid ? await supabaseAdmin.from('user_roles').select('role').eq('user_id', uid) : { data: null };
  let signer = uid;
  if (!signer && (req.gestora === 'pedagogica' || req.gestora === 'administrativa')) { const { data: r } = await supabaseAdmin.from('user_roles').select('user_id').eq('role', req.gestora).limit(1).maybeSingle(); signer = r?.user_id ?? null; }
   if (panel && !panel.ativo) throw new Error('Este painel está desativado.');
   if (exigeIdentificacaoAssinatura(req.gestora, panel?.tipo_painel, (roles ?? []).map(r => r.role)) && (!data.nome?.trim() || !data.funcao?.trim() || !cpfValido(data.cpf ?? ''))) throw new Error('Informe nome completo, função e CPF válido.');
   if (!signer && !req.gestora.startsWith('extra:')) throw new Error('Não foi possível conferir a conta destinatária.');
  if (signer) {
    if (!data.password) throw new Error('Informe a senha do seu painel para assinar.');
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(signer);
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env['SUPABASE_URL']; const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key || !user.user?.email) throw new Error('Não foi possível conferir a conta.');
     const verifier = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
       const headers = new Headers(init?.headers);
       if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
       headers.set('apikey', key);
       return fetch(input, { ...init, headers });
     } } });
    const { data: signed, error } = await verifier.auth.signInWithPassword({ email: user.user.email, password: data.password });
    if (error || signed.user?.id !== signer) throw new Error('Senha do painel incorreta.');
    await verifier.auth.signOut({scope:'local'});
  }
  const { error } = await supabaseAdmin.rpc('assinar_identificado', { _token: data.token, _decisao: data.decisao, _observacoes: data.observacoes, _nome: data.nome ?? '', _funcao: data.funcao ?? '', _cpf: (data.cpf ?? '').replace(/\D/g,'') });
  if (error) throw new Error('Não foi possível assinar esta versão.');
  return { ok: true };
});
export const getVerificacao = createServerFn({ method: 'POST' }).inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d)).handler(async ({ data }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: doc } = await supabaseAdmin.from('documentos').select('dados,emitido_em,status,versao').eq('id',data.id).maybeSingle();
  if (!doc?.emitido_em) return { found: false as const };
  const { data: sols } = await supabaseAdmin.from('solicitacoes_assinatura').select('gestora,signatario_nome,signatario_funcao,decisao,assinado_em').eq('documento_id',data.id).eq('versao',doc.versao);
  const d = doc.dados as Record<string,unknown>;
  return { found: true as const, tipo: String(d['tipo']??''),numero:Number(d['numero']??0),ano:Number(d['ano']??0),sigla:String(d['sigla']??''),assunto:String(d['assunto']??''),assinante:String(d['assinante']??''),cargo:String(d['cargo']??''),emitidoEm:doc.emitido_em,status:doc.status,assinaturas:(sols??[]).map(s=>({nome:s.signatario_nome,cargo:s.signatario_funcao,gestora:s.gestora as 'pedagogica'|'administrativa',decisao:s.decisao,assinadoEm:s.assinado_em})) };
});
