import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { unidadeSchema, type Unidade } from './unidades';

type AuthContext = { supabase: any; userId: string };

async function exigirAdmin(context: AuthContext) {
  const { data: admin, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (error || !admin) throw new Error('Acesso restrito ao administrador.');
}

export const listarUnidades = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase
    .from('unidades')
    .select('id,nome,sigla,pai_id,ativa,pode_emitir,pode_receber')
    .order('nome')
    .limit(500);
  if (error) throw new Error('Não foi possível carregar as unidades.');
  return (data ?? []) as Unidade[];
});

export const listarGestaoUnidades = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await exigirAdmin(context);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const [unidadesRes, integrantesRes, usuariosRes, rolesRes, paineisRes] = await Promise.all([
    context.supabase.from('unidades').select('id,nome,sigla,pai_id,ativa,pode_emitir,pode_receber').order('nome').limit(500),
    context.supabase.from('integrantes').select('id,nome,funcao,situacao,unidade,unidade_id').order('nome').limit(500),
    supabaseAdmin.auth.admin.listUsers({ perPage: 100 }),
    supabaseAdmin.from('user_roles').select('user_id,role'),
    supabaseAdmin.from('paineis').select('user_id,nome,funcao,tipo_painel,setor,ativo,pode_emitir,unidade_id'),
  ]);
  if (unidadesRes.error || integrantesRes.error || usuariosRes.error) {
    throw new Error('Não foi possível carregar a gestão de unidades.');
  }
  const rolePor = new Map((rolesRes.data ?? []).map(r => [r.user_id, r.role as string]));
  const painelPor = new Map((paineisRes.data ?? []).map(p => [p.user_id, p]));
  const contas = usuariosRes.data.users.map(u => {
    const painel = painelPor.get(u.id);
    return {
      id: u.id,
      email: u.email ?? '',
      role: rolePor.get(u.id) ?? '',
      nome: painel?.nome || u.email || 'Conta sem nome',
      funcao: painel?.funcao || '',
      ativo: painel?.ativo ?? true,
      unidade_id: painel?.unidade_id ?? null,
    };
  });
  return {
    unidades: (unidadesRes.data ?? []) as Unidade[],
    contas,
    integrantes: (integrantesRes.data ?? []) as Array<{
      id: string; nome: string; funcao: string; situacao: string; unidade: string; unidade_id: string | null;
    }>,
  };
});

export const salvarUnidade = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => unidadeSchema.parse(value))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { id, ...campos } = data;
    const payload = { ...campos, sigla: campos.sigla.toUpperCase() };
    if (id) {
      const { data: atualizada, error } = await context.supabase
        .from('unidades')
        .update(payload)
        .eq('id', id)
        .select('id,nome,sigla,pai_id,ativa,pode_emitir,pode_receber')
        .single();
      if (error || !atualizada) {
        if (error?.code === '23505') throw new Error('Já existe uma unidade com essa sigla neste nível.');
        if (error?.message?.includes('ciclo')) throw new Error('Uma unidade não pode pertencer a uma subunidade dela mesma.');
        throw new Error('Não foi possível atualizar a unidade.');
      }
      return atualizada as Unidade;
    }
    const { data: criada, error } = await context.supabase
      .from('unidades')
      .insert(payload)
      .select('id,nome,sigla,pai_id,ativa,pode_emitir,pode_receber')
      .single();
    if (error || !criada) {
      if (error?.code === '23505') throw new Error('Já existe uma unidade com essa sigla neste nível.');
      throw new Error('Não foi possível criar a unidade.');
    }
    return criada as Unidade;
  });

export const vincularContaUnidade = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ userId: z.string().uuid(), unidadeId: z.string().uuid().nullable() }).parse(value))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: existente } = await supabaseAdmin.from('paineis').select('user_id').eq('user_id', data.userId).maybeSingle();
    if (existente) {
      const { error } = await supabaseAdmin.from('paineis').update({ unidade_id: data.unidadeId }).eq('user_id', data.userId);
      if (error) throw new Error('Não foi possível vincular a conta à unidade.');
      return { ok: true };
    }
    const [{ data: u }, { data: r }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(data.userId),
      supabaseAdmin.from('user_roles').select('role').eq('user_id', data.userId).maybeSingle(),
    ]);
    const rotulo = r?.role === 'pedagogica' ? 'Gestora Pedagógica' : r?.role === 'administrativa' ? 'Gestora Administrativa' : r?.role === 'admin' ? 'Coordenação de Comunicação e Mídia' : 'Painel';
    const { error } = await supabaseAdmin.from('paineis').insert({
      user_id: data.userId,
      nome: u.user?.email ?? rotulo,
      funcao: rotulo,
      unidade_id: data.unidadeId,
    });
    if (error) throw new Error('Não foi possível vincular a conta à unidade.');
    return { ok: true };
  });

export const vincularIntegranteUnidade = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ integranteId: z.string().uuid(), unidadeId: z.string().uuid().nullable() }).parse(value))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    let nomeUnidade: string | undefined;
    if (data.unidadeId) {
      const { data: u } = await context.supabase.from('unidades').select('nome').eq('id', data.unidadeId).maybeSingle();
      if (!u) throw new Error('Unidade não encontrada.');
      nomeUnidade = u.nome;
    }
    const updateData = nomeUnidade ? { unidade_id: data.unidadeId, unidade: nomeUnidade } : { unidade_id: null };
    const { error } = await context.supabase.from('integrantes').update(updateData).eq('id', data.integranteId);
    if (error) throw new Error('Não foi possível vincular o integrante à unidade.');
    return { ok: true };
  });