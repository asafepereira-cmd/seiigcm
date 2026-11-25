import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { GESTORAS, numeroFormatado, type Documento } from './documento';
import { corrigirNome } from './document-identity';
import { dataHora } from './assinaturas-eletronicas';

const APP_ORIGIN = 'https://seii.cemfgm.com.br';

export const notificarSignatariosDocumento = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ documentoId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: doc, error: docError } = await context.supabase
      .from('documentos')
      .select('id,criado_por,dados,versao,emitido_em')
      .eq('id', data.documentoId)
      .single();
    if (docError || !doc || doc.criado_por !== context.userId) {
      throw new Error('Documento indisponível.');
    }

    const { data: requests } = await context.supabase
      .from('solicitacoes_assinatura')
      .select('id,gestora,signatario_nome,finalidade,token,assinado_em')
      .eq('documento_id', doc.id)
      .eq('versao', doc.versao)
      .is('assinado_em', null);

    const pendentes = (requests ?? []).filter(
      (r) => !r.gestora.startsWith('emissor:') && !r.gestora.startsWith('extra:'),
    );
    if (!pendentes.length) {
      return { enviadas: 0, suprimidas: 0, pendentesVerificacao: false, falhas: 0 };
    }

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { sendTemplateEmail } = await import('@/lib/email-templates/send-email');
    const { EmailAPIError } = await import('@lovable.dev/email-js');

    const [{ data: roles }, { data: panels }, { data: emitterPanel }] = await Promise.all([
      supabaseAdmin.from('user_roles').select('user_id,role').in('role', ['pedagogica', 'administrativa']),
      supabaseAdmin.from('paineis').select('user_id,nome,setor,tipo_painel'),
      supabaseAdmin.from('paineis').select('setor,nome').eq('user_id', context.userId).maybeSingle(),
    ]);

    const panelMap = new Map((panels ?? []).map((p) => [p.user_id, p]));
    const documentData = doc.dados as unknown as Documento;
    const identificacao = numeroFormatado(documentData);
    const emissor = corrigirNome(documentData.assinante || emitterPanel?.nome || 'Emissor SEII');
    const setorEmissor = emitterPanel?.setor || undefined;
    const { data: dataEnvio, hora: horaEnvio } = dataHora(doc.emitido_em || new Date().toISOString());
    const enviadoEm = `${dataEnvio} às ${horaEnvio}`;

    let enviadas = 0;
    let suprimidas = 0;
    let falhas = 0;
    let pendentesVerificacao = false;

    for (const sol of pendentes) {
      const uid = sol.gestora.startsWith('user:')
        ? sol.gestora.slice(5)
        : roles?.find((r) => r.role === sol.gestora)?.user_id;
      if (!uid) continue;

      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(uid);
      const email = userRes.user?.email;
      if (!email) continue;

      const panel = panelMap.get(uid);
      const gestoraInfo = GESTORAS[sol.gestora as keyof typeof GESTORAS];
      const destinatarioNome =
        sol.signatario_nome ||
        gestoraInfo?.nome ||
        (panel?.tipo_painel === 'setor' ? panel.setor : panel?.nome) ||
        'Signatário(a)';

      try {
        const res = await sendTemplateEmail('documento-assinatura', email, {
          templateData: {
            destinatarioNome,
            identificacao,
            setorEmissor,
            emissor,
            assunto: documentData.assunto || 'Documento encaminhado no SEII',
            enviadoEm,
            finalidade: sol.finalidade === 'ciencia' ? 'ciencia' : 'deferimento',
            linkAcesso: `${APP_ORIGIN}/assinar/${sol.token}`,
            linkPainel: `${APP_ORIGIN}/painel`,
          },
          idempotencyKey: `documento-assinatura-${sol.id}`,
        });
        if (res.sent) enviadas += 1;
        else suprimidas += 1;
      } catch (err) {
        if (err instanceof EmailAPIError && err.code === 'domain_not_verified') {
          pendentesVerificacao = true;
        } else {
          falhas += 1;
        }
        console.error('Falha ao enviar notificação por e-mail', {
          documentoId: doc.id,
          solicitacaoId: sol.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { enviadas, suprimidas, pendentesVerificacao, falhas };
  });