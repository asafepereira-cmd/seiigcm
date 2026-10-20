import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

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