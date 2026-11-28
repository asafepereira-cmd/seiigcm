import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const idSchema = z.object({ id: z.string().uuid() });
const dadosIntegrante = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(3).max(200),
  cpf: z.string().trim().max(30),
  rg: z.string().trim().max(30),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  telefone: z.string().trim().max(40),
  email: z.string().trim().max(200),
  endereco: z.string().trim().max(500),
  vinculo: z.string().trim().min(2).max(100),
  funcao: z.string().trim().max(200),
  unidade: z.string().trim().min(2).max(200),
  unidade_id: z.string().uuid().nullable().default(null),
  data_ingresso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  situacao: z.enum(['Ativo', 'Afastado', 'Desligado']),
  observacoes: z.string().max(10000),
  dados_extras: z.array(z.object({ rotulo: z.string().trim().max(100), valor: z.string().max(2000) })).max(30),
});

type AuthContext = { supabase: any; userId: string };
async function exigirAdmin(context: AuthContext) {
  const { data: admin, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (error || !admin) throw new Error('Acesso restrito ao administrador.');
}

export const listarIntegrantes = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await exigirAdmin(context);
  const { data, error } = await context.supabase.from('integrantes').select('id,nome,cpf,vinculo,funcao,unidade,unidade_id,data_ingresso,situacao,created_at').order('nome').limit(200);
  if (error) throw new Error('Não foi possível consultar os integrantes.');
  return data;
});

export const salvarIntegrante = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => dadosIntegrante.parse(value)).handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { id, ...campos } = data;
    if (id) {
      const { data: atualizado, error } = await context.supabase.from('integrantes').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error || !atualizado) throw new Error('Não foi possível atualizar o integrante.');
      return atualizado;
    }
    const { data: criado, error } = await context.supabase.from('integrantes').insert({ ...campos, criado_por: context.userId }).select().single();
    if (error || !criado) throw new Error('Não foi possível cadastrar o integrante.');
    return criado;
  });

export const obterIntegrante = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => idSchema.parse(value)).handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const [integrante, anexos, ocorrencias, minutas] = await Promise.all([
      context.supabase.from('integrantes').select('*').eq('id', data.id).single(),
      context.supabase.from('integrante_anexos').select('*').eq('integrante_id', data.id).order('created_at', { ascending: false }).limit(100),
      context.supabase.from('integrante_ocorrencias').select('*').eq('integrante_id', data.id).order('ocorrido_em', { ascending: false }).limit(100),
      context.supabase.from('minutas_fisicas').select('id,tipo,titulo,conteudo,dados,created_at').eq('integrante_id', data.id).order('created_at', { ascending: false }).limit(100),
    ]);
    if (integrante.error || !integrante.data) throw new Error('Integrante não encontrado.');
    if (anexos.error || ocorrencias.error || minutas.error) throw new Error('Não foi possível abrir o dossiê completo.');
    return { integrante: integrante.data, anexos: anexos.data, ocorrencias: ocorrencias.data, minutas: minutas.data };
  });

export const prepararAnexoIntegrante = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    integranteId: z.string().uuid(), nome: z.string().trim().min(1).max(200),
    mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']), tamanho: z.number().int().positive().max(10 * 1024 * 1024),
  }).parse(value)).handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { data: integrante } = await context.supabase.from('integrantes').select('id').eq('id', data.integranteId).single();
    if (!integrante) throw new Error('Integrante não encontrado.');
    const extensao = data.mimeType === 'application/pdf' ? 'pdf' : data.mimeType === 'image/png' ? 'png' : 'jpg';
    const path = `${data.integranteId}/${crypto.randomUUID()}.${extensao}`;
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: upload, error } = await supabaseAdmin.storage.from('integrantes-documentos').createSignedUploadUrl(path);
    if (error || !upload) throw new Error('Não foi possível preparar o envio.');
    return { path, token: upload.token, nome: data.nome };
  });

export const registrarAnexoIntegrante = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    integranteId: z.string().uuid(), nome: z.string().trim().min(1).max(200), path: z.string().max(500),
    mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']), tamanho: z.number().int().positive().max(10 * 1024 * 1024),
  }).parse(value)).handler(async ({ data, context }) => {
    await exigirAdmin(context);
    if (!new RegExp(`^${data.integranteId}/[a-f0-9-]+\\.(pdf|jpe?g|png)$`, 'i').test(data.path)) throw new Error('Arquivo inválido.');
    const extensao = data.mimeType === 'application/pdf' ? 'pdf' : data.mimeType === 'image/png' ? 'png' : 'jpg';
    if (!data.path.toLowerCase().endsWith(`.${extensao}`)) throw new Error('O tipo do arquivo não confere.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: objetos, error: erroObjeto } = await supabaseAdmin.storage.from('integrantes-documentos').list(data.integranteId, { limit: 1000, search: data.path.split('/')[1]?.split('.')[0] ?? '' });
    if (erroObjeto || !objetos?.some(o => `${data.integranteId}/${o.name}` === data.path)) throw new Error('Arquivo não encontrado. Tente enviar novamente.');
    const { error } = await context.supabase.from('integrante_anexos').insert({ integrante_id: data.integranteId, nome: data.nome, caminho: data.path, mime_type: data.mimeType, tamanho: data.tamanho, criado_por: context.userId });
    if (error) throw new Error('Não foi possível registrar o documento.');
    return { ok: true };
  });

export const baixarAnexoIntegrante = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => idSchema.parse(value)).handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { data: anexo, error } = await context.supabase.from('integrante_anexos').select('caminho').eq('id', data.id).single();
    if (error || !anexo) throw new Error('Documento não encontrado.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: assinado, error: erroUrl } = await supabaseAdmin.storage.from('integrantes-documentos').createSignedUrl(anexo.caminho, 60);
    if (erroUrl || !assinado) throw new Error('Não foi possível abrir o documento.');
    return { url: assinado.signedUrl };
  });

export const excluirAnexoIntegrante = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => idSchema.parse(value)).handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { data: anexo, error } = await context.supabase.from('integrante_anexos').select('caminho').eq('id', data.id).single();
    if (error || !anexo) throw new Error('Documento não encontrado.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error: erroArquivo } = await supabaseAdmin.storage.from('integrantes-documentos').remove([anexo.caminho]);
    if (erroArquivo) throw new Error('Não foi possível excluir o arquivo.');
    const { error: erroRegistro } = await context.supabase.from('integrante_anexos').delete().eq('id', data.id);
    if (erroRegistro) throw new Error('O arquivo foi excluído, mas o registro precisa ser revisado.');
    return { ok: true };
  });

export const registrarOcorrenciaIntegrante = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    integranteId: z.string().uuid(), tipo: z.enum(['Advertência', 'Processo', 'Ocorrência']),
    titulo: z.string().trim().min(2).max(200), descricao: z.string().trim().min(2).max(10000),
    ocorridoEm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).parse(value)).handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { error } = await context.supabase.from('integrante_ocorrencias').insert({ integrante_id: data.integranteId, tipo: data.tipo, titulo: data.titulo, descricao: data.descricao, ocorrido_em: data.ocorridoEm, criado_por: context.userId });
    if (error) throw new Error('Não foi possível registrar a ocorrência.');
    return { ok: true };
  });

export const registrarMinutaFisica = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    integranteId: z.string().uuid(), tipo: z.enum(['integrante', 'credenciamento', 'voluntariado', 'outros']),
    titulo: z.string().trim().min(2).max(300), conteudo: z.string().trim().min(2).max(60000),
    dados: z.record(z.string(), z.unknown()),
  }).parse(value)).handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { data: minuta, error } = await context.supabase.from('minutas_fisicas').insert({ integrante_id: data.integranteId, tipo: data.tipo, titulo: data.titulo, conteudo: data.conteudo, dados: data.dados as never, criado_por: context.userId }).select('id').single();
    if (error || !minuta) throw new Error('Não foi possível guardar a minuta no dossiê.');
    return minuta;
  });
