import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { profileNameInput } from './profile';

export const atualizarMeuNome = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => profileNameInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: ativo, error: activeError } = await context.supabase.rpc('conta_ativa', { _uid: context.userId });
    if (activeError || !ativo) throw new Error('Conta indisponível.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: painel, error } = await supabaseAdmin.from('paineis').select('tipo_painel').eq('user_id', context.userId).maybeSingle();
    if (error) throw new Error('Não foi possível carregar o perfil.');
    if (painel) {
      const { error: saveError } = await supabaseAdmin.from('paineis').update(painel.tipo_painel === 'setor' ? { nome: data.nome, setor: data.nome } : { nome: data.nome }).eq('user_id', context.userId);
      if (saveError) throw new Error('Não foi possível alterar o nome.');
    } else {
      const { error: saveError } = await context.supabase.auth.updateUser({ data: { display_name: data.nome } });
      if (saveError) throw new Error('Não foi possível alterar o nome.');
    }
    return { ok: true };
  });
export function mensagemSenha(message: string) {
  const m = message.toLowerCase();
  if (m.includes('pwned') || m.includes('leaked') || m.includes('known')) return 'Essa senha aparece em listas de senhas vazadas. Escolha outra.';
  if (m.includes('weak') || m.includes('at least') || m.includes('characters')) return 'Senha fraca: use ao menos 8 caracteres, com letras e números.';
  if (m.includes('same') || m.includes('different')) return 'A nova senha deve ser diferente da atual.';
  return 'Não foi possível alterar a senha.';
}

export const alterarMinhaSenha = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ atual: z.string().min(1).max(128), nova: z.string().min(8).max(128) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: user } = await context.supabase.auth.getUser();
    if (!user.user?.email) throw new Error('Conta indisponível.');
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env['SUPABASE_URL']; const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) throw new Error('Serviço indisponível.');
    const verifier = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers); if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key); return fetch(input, { ...init, headers });
    } } });
    const { data: ok, error } = await verifier.auth.signInWithPassword({ email: user.user.email, password: data.atual });
    if (error || ok.user?.id !== context.userId) throw new Error('Senha atual incorreta.');
    await verifier.auth.signOut({ scope: 'local' });
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error: e2 } = await supabaseAdmin.auth.admin.updateUserById(context.userId, { password: data.nova });
    if (e2) throw new Error(mensagemSenha(e2.message));
    return { ok: true };
  });
