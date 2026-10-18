import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

async function exigirAdmin(context: { supabase: any; userId: string }) {
  const { data: admin, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (error || !admin) throw new Error('Acesso restrito.');
}

export const listarContas = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await exigirAdmin(context);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: usuarios, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 });
  if (error) throw new Error('Não foi possível listar as contas.');
  const [{ data: roles }, { data: paineis }] = await Promise.all([
    supabaseAdmin.from('user_roles').select('user_id,role'),
    supabaseAdmin.from('paineis').select('user_id,nome,funcao,pode_emitir,pode_assinar,pode_comentar,ativo'),
  ]);
  const rolePor = new Map((roles ?? []).map(r => [r.user_id, r.role as string]));
  const painelPor = new Map((paineis ?? []).map(p => [p.user_id, p]));
  return usuarios.users.map(u => ({
    id: u.id,
    email: u.email ?? '',
    role: rolePor.get(u.id) ?? '',
    painel: painelPor.get(u.id) ?? null,
  }));
});

export const alterarEmail = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { email: data.email, email_confirm: true });
    if (error) throw new Error('Não foi possível alterar o e-mail.');
    return { ok: true };
  });

export const alterarSenha = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), password: z.string().min(8).max(128) }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new Error('Não foi possível alterar a senha.');
    return { ok: true };
  });

export const excluirConta = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    if (data.id === context.userId) throw new Error('Você não pode excluir a própria conta.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await supabaseAdmin.from('paineis').delete().eq('user_id', data.id);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', data.id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error('Não foi possível excluir a conta.');
    return { ok: true };
  });

export const atualizarPermissoes = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    nome: z.string().trim().max(200),
    funcao: z.string().trim().max(200),
    pode_emitir: z.boolean(),
    pode_assinar: z.boolean(),
    pode_comentar: z.boolean(),
    ativo: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    if (data.id === context.userId && (!data.ativo || !data.pode_emitir)) throw new Error('Sua própria conta não pode perder emissão nem ser desativada.');
    const { error } = await supabaseAdmin.from('paineis').upsert({
      user_id: data.id, nome: data.nome || 'Painel', funcao: data.funcao || 'Painel',
      pode_emitir: data.pode_emitir, pode_assinar: data.pode_assinar, pode_comentar: data.pode_comentar, ativo: data.ativo,
    });
    if (error) throw new Error('Não foi possível salvar as permissões.');
    return { ok: true };
  });
