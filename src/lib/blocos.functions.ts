import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { cpfValido } from './sector';
import { GESTORAS } from './documento';
import { corrigirNome } from './document-identity';
import { gestoraDaConta } from './signature-identity';

export const signBlock = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), password: z.string().min(1).max(128), nome: z.string().max(200), funcao: z.string().max(200), cpf: z.string().max(20), concordo: z.literal(true), decisao: z.enum(['deferido', 'indeferido', 'ciente']) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: block } = await context.supabase.from('blocos_assinatura').select('id,user_id,assinado_em').eq('id', data.id).single();
    const { data: allowed } = await context.supabase.rpc('permissao_painel', { _uid: context.userId, _acao: 'assinar' });
    if (!block || block.user_id !== context.userId || block.assinado_em || !allowed) throw new Error('Bloco indisponível para assinatura.');
    const [{ data: panel }, { data: roles }, { data: account }] = await Promise.all([
      context.supabase.from('paineis').select('tipo_painel,nome,funcao').eq('user_id', context.userId).maybeSingle(),
      context.supabase.from('user_roles').select('role').eq('user_id', context.userId),
      context.supabase.auth.getUser(),
    ]);
    const manager = gestoraDaConta('', (roles ?? []).map(r => r.role));
    const manual = panel?.tipo_painel === 'setor' && !manager;
    if (manual && (!data.nome.trim() || !data.funcao.trim() || !cpfValido(data.cpf))) throw new Error('Informe nome, função e CPF válido.');
    const identity = manager ? GESTORAS[manager] : null;
    const nome = corrigirNome(manual ? data.nome : identity?.nome ?? panel?.nome ?? '');
    const funcao = manual ? data.funcao : identity?.cargo ?? panel?.funcao ?? '';
    if (!nome || !funcao) throw new Error('Cadastre nome e função no painel antes de assinar.');
    const url = process.env['SUPABASE_URL']; const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    const email = account.user?.email;
    if (!url || !key || !email) throw new Error('Não foi possível conferir a conta.');
    const { createClient } = await import('@supabase/supabase-js');
    const verifier = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key); return fetch(input, { ...init, headers });
    } } });
    const { data: verified, error } = await verifier.auth.signInWithPassword({ email, password: data.password });
    if (error || verified.user?.id !== context.userId) throw new Error('Senha da conta incorreta.');
    await verifier.auth.signOut({ scope: 'local' });
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: count, error: signError } = await supabaseAdmin.rpc('assinar_bloco', { _bloco: data.id, _autor: context.userId, _nome: nome, _funcao: funcao, _cpf: data.cpf.replace(/\D/g, ''), _decisao: data.decisao });
    if (signError) throw new Error('Nenhum documento foi assinado. Confira se as versões e solicitações ainda estão disponíveis e recrie o bloco.');
    return { count };
  });
