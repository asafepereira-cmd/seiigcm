import { createServerFn } from '@tanstack/react-start';
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