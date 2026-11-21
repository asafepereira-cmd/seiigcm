import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { signatariosUltimaVersao, type SignatarioEditor } from './document-editor';

export const signatariosDocumento = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: document } = await context.supabase.from('documentos').select('criado_por').eq('id', data.id).single();
    if (!document || document.criado_por !== context.userId) throw new Error('Documento indisponível.');
    const { data: rows, error } = await context.supabase.from('solicitacoes_assinatura')
      .select('gestora,signatario_nome,signatario_funcao,versao,finalidade').eq('documento_id', data.id);
    if (error) throw new Error('Não foi possível recuperar os signatários.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: roles } = await supabaseAdmin.from('user_roles').select('user_id,role').in('role', ['pedagogica','administrativa']);
    const latest = signatariosUltimaVersao(rows ?? []);
    const selected: SignatarioEditor[] = [];
    for (const row of latest) {
      const external = row.gestora.startsWith('extra:');
      const id = row.gestora.startsWith('user:') ? row.gestora.slice(5) : external ? row.gestora : roles?.find(role => role.role === row.gestora)?.user_id;
      if (id && !selected.some(item => item.id === id)) selected.push({ id, nome: row.signatario_nome ?? (row.gestora === 'pedagogica' ? 'Gestora Pedagógica' : 'Gestora Administrativa'), funcao: row.signatario_funcao ?? '', externo: external });
    }
    return { selected, purpose: latest[0]?.finalidade === 'ciencia' ? 'ciencia' as const : 'deferimento' as const };
  });

export const destinatarios = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: active } = await context.supabase.rpc('conta_ativa', { _uid: context.userId });
  if (!active) throw new Error('Conta indisponível.');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const [{ data: panels }, { data: roles }] = await Promise.all([
    supabaseAdmin.from('paineis').select('user_id,nome,funcao,setor,tipo_painel').eq('ativo', true),
    supabaseAdmin.from('user_roles').select('user_id,role'),
  ]);
  const result = (panels ?? []).map(p => ({ id: p.user_id, nome: p.tipo_painel === 'setor' ? p.setor : p.nome }));
  for (const r of roles ?? []) if (!result.some(p => p.id === r.user_id) && r.role !== 'emissor') result.push({ id: r.user_id, nome: r.role === 'admin' ? 'Administrador — Asafe Felix' : r.role === 'pedagogica' ? 'Gestora Pedagógica' : 'Gestora Administrativa' });
  return result;
});

export const enviarSolicitacao = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ destino: z.string().uuid(), texto: z.string().trim().min(1).max(5000), nome: z.string().trim().min(3).max(200), funcao: z.string().trim().min(2).max(200), concordo: z.literal(true) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: active } = await context.supabase.rpc('conta_ativa', { _uid: context.userId });
    if (!active) throw new Error('Conta indisponível.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: role } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', data.destino).limit(1).maybeSingle();
    const { data: panel } = await supabaseAdmin.from('paineis').select('nome,ativo').eq('user_id', data.destino).maybeSingle();
    if (!role || panel?.ativo === false) throw new Error('Destinatário indisponível.');
    const { error } = await supabaseAdmin.from('solicitacoes_internas').insert({ criado_por: context.userId, destinatario_id: data.destino, destinatario: panel?.nome ?? role.role, texto: data.texto, assinante_nome: data.nome, assinante_funcao: data.funcao });
    if (error) throw new Error('Não foi possível enviar a solicitação.');
    return { ok: true };
  });