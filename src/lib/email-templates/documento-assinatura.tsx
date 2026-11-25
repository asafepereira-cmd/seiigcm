import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { TemplateEntry } from './registry';

export interface DocumentoAssinaturaProps {
  destinatarioNome?: string;
  identificacao?: string;
  setorEmissor?: string;
  emissor?: string;
  assunto?: string;
  enviadoEm?: string;
  finalidade?: 'deferimento' | 'ciencia';
  linkAcesso?: string;
  linkPainel?: string;
}

const PANEL_FALLBACK = 'https://seii.cemfgm.com.br/painel';

export const DocumentoAssinaturaEmail = ({
  destinatarioNome,
  identificacao = 'Documento SEII',
  setorEmissor,
  emissor = 'Coordenação de Comunicação e Mídia',
  assunto = 'Documento encaminhado no SEII',
  enviadoEm,
  finalidade = 'deferimento',
  linkAcesso = PANEL_FALLBACK,
  linkPainel = PANEL_FALLBACK,
}: DocumentoAssinaturaProps) => {
  const isCiencia = finalidade === 'ciencia';
  const previewText = isCiencia
    ? `Novo documento para sua ciência no SEII: ${identificacao}`
    : `Novo documento aguardando sua assinatura no SEII: ${identificacao}`;

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerGov}>GOVERNO DO ESTADO DE RORAIMA</Text>
            <Text style={headerSchool}>
              COLÉGIO ESTADUAL MILITARIZADO FERNANDO GRANGEIRO DE MENEZES
            </Text>
            <Text style={headerSystem}>
              Sistema Eletrônico de Informações Internas (SEII)
            </Text>
          </Section>

          <Section style={content}>
            <Heading as="h1" style={heading}>
              {isCiencia
                ? 'Novo documento para sua ciência'
                : 'Novo documento aguardando sua assinatura'}
            </Heading>

            <Text style={paragraph}>
              {destinatarioNome ? `Olá, ${destinatarioNome},` : 'Olá,'}
            </Text>

            <Text style={paragraph}>
              {isCiencia
                ? 'Um novo documento foi encaminhado para a sua ciência no sistema SEII.'
                : 'Um novo documento foi encaminhado para a sua assinatura eletrônica no sistema SEII.'}
            </Text>

            <Section style={card}>
              <Text style={cardTitle}>
                {isCiencia
                  ? 'DOCUMENTO PARA CIÊNCIA'
                  : 'DOCUMENTO PENDENTE DE ASSINATURA'}
              </Text>
              <Text style={detailRow}>
                <strong>Tipo e Número:</strong> {identificacao}
              </Text>
              {setorEmissor ? (
                <Text style={detailRow}>
                  <strong>Setor Emissor:</strong> {setorEmissor}
                </Text>
              ) : null}
              <Text style={detailRow}>
                <strong>Emissor:</strong> {emissor}
              </Text>
              <Text style={detailRow}>
                <strong>Assunto:</strong> {assunto}
              </Text>
              {enviadoEm ? (
                <Text style={detailRowLast}>
                  <strong>Data de Envio:</strong> {enviadoEm}
                </Text>
              ) : null}
            </Section>

            <Section style={ctaWrap}>
              <Button style={button} href={linkAcesso}>
                {isCiencia ? 'Acessar documento' : 'Acessar e assinar documento'}
              </Button>
            </Section>

            <Text style={linkHint}>
              Caso o botão não funcione, acesse diretamente pelo link:{' '}
              <Link href={linkAcesso} style={link}>
                {linkAcesso}
              </Link>
            </Text>
            <Text style={linkHint}>
              Você também pode acompanhar todas as pendências no seu painel:{' '}
              <Link href={linkPainel} style={link}>
                {linkPainel}
              </Link>
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              Mensagem automática enviada pela plataforma SEII — Colégio Estadual
              Militarizado Fernando Grangeiro de Menezes. Por favor, não responda
              a este e-mail.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: DocumentoAssinaturaEmail,
  subject: (data: Record<string, any>) => {
    const id = data['identificacao'] || 'Documento SEII';
    return data['finalidade'] === 'ciencia'
      ? `[SEII] Novo documento para sua ciência: ${id}`
      : `[SEII] Novo documento aguardando sua assinatura: ${id}`;
  },
  displayName: 'Notificação de documento para assinatura',
  previewData: {
    destinatarioNome: 'Gestora Administrativa',
    identificacao: 'OFÍCIO Nº 018/2026 – CEMXXXIII/CCM',
    setorEmissor: 'Coordenação de Comunicação e Mídia',
    emissor: 'ASAFE PEREIRA DA SILVA FELIX',
    assunto: 'Solicitação de autorização para gravação institucional',
    enviadoEm: '25/11/2026 às 09:30',
    finalidade: 'deferimento',
    linkAcesso: 'https://seii.cemfgm.com.br/painel',
    linkPainel: 'https://seii.cemfgm.com.br/painel',
  },
} satisfies TemplateEntry;

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  margin: 0,
  padding: '24px 0',
};

const container: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  border: '1px solid #d9e1f2',
  borderRadius: '8px',
  overflow: 'hidden',
  backgroundColor: '#ffffff',
};

const header: React.CSSProperties = {
  backgroundColor: '#1a3276',
  padding: '22px 28px',
  textAlign: 'center',
};

const headerGov: React.CSSProperties = {
  color: '#dbe6ff',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  margin: '0 0 4px',
};

const headerSchool: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 700,
  lineHeight: '1.35',
  margin: '0 0 6px',
};

const headerSystem: React.CSSProperties = {
  color: '#c7d7ff',
  fontSize: '12px',
  margin: 0,
};

const content: React.CSSProperties = {
  padding: '28px 28px 20px',
};

const heading: React.CSSProperties = {
  color: '#1a3276',
  fontSize: '20px',
  fontWeight: 700,
  lineHeight: '1.3',
  margin: '0 0 16px',
};

const paragraph: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '15px',
  lineHeight: '1.55',
  margin: '0 0 14px',
};

const card: React.CSSProperties = {
  backgroundColor: '#f5f7fb',
  border: '1px solid #d9e1f2',
  borderRadius: '6px',
  padding: '16px 18px',
  margin: '18px 0 22px',
};

const cardTitle: React.CSSProperties = {
  color: '#1a3276',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  margin: '0 0 10px',
};

const detailRow: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '14px',
  lineHeight: '1.45',
  margin: '0 0 6px',
};

const detailRowLast: React.CSSProperties = {
  ...detailRow,
  margin: 0,
};

const ctaWrap: React.CSSProperties = {
  textAlign: 'center',
  margin: '24px 0 20px',
};

const button: React.CSSProperties = {
  backgroundColor: '#1a3276',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 700,
  textDecoration: 'none',
  padding: '13px 26px',
  display: 'inline-block',
};

const linkHint: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0 0 8px',
  wordBreak: 'break-all',
};

const link: React.CSSProperties = {
  color: '#1a3276',
  textDecoration: 'underline',
};

const divider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '0 28px',
};

const footer: React.CSSProperties = {
  padding: '16px 28px 22px',
};

const footerText: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: 0,
};