import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { render } from '@react-email/render';
import { TEMPLATES } from '@/lib/email-templates/registry';

describe('template de notificação de documento para assinatura', () => {
  it('registra o template e renderiza dados do documento para assinatura', async () => {
    const entry = TEMPLATES['documento-assinatura'];
    expect(entry).toBeDefined();
    if (!entry) return;

    const data = {
      destinatarioNome: 'Adriana Rosado',
      identificacao: 'TERMO Nº 004/2026 – CEMXXXIII/CCM',
      setorEmissor: 'Coordenação de Comunicação e Mídia',
      emissor: 'ASAFE PEREIRA DA SILVA FELIX',
      assunto: 'Autorização institucional',
      enviadoEm: '25/11/2026 às 09:30',
      finalidade: 'deferimento' as const,
      linkAcesso: 'https://seii.cemfgm.com.br/assinar/token-teste',
      linkPainel: 'https://seii.cemfgm.com.br/painel',
    };

    const subject = typeof entry.subject === 'function' ? entry.subject(data) : entry.subject;
    expect(subject).toBe('[SEII] Novo documento aguardando sua assinatura: TERMO Nº 004/2026 – CEMXXXIII/CCM');

    const html = await render(React.createElement(entry.component, data));
    expect(html).toContain('COLÉGIO ESTADUAL MILITARIZADO FERNANDO GRANGEIRO DE MENEZES');
    expect(html).toContain('TERMO Nº 004/2026 – CEMXXXIII/CCM');
    expect(html).toContain('ASAFE PEREIRA DA SILVA FELIX');
    expect(html).toContain('https://seii.cemfgm.com.br/assinar/token-teste');
  });

  it('adapta assunto e texto quando a finalidade é ciência', async () => {
    const entry = TEMPLATES['documento-assinatura'];
    expect(entry).toBeDefined();
    if (!entry) return;

    const data = {
      identificacao: 'OFÍCIO Nº 020/2026 – CEMXXXIII/CCM',
      finalidade: 'ciencia' as const,
    };

    const subject = typeof entry.subject === 'function' ? entry.subject(data) : entry.subject;
    expect(subject).toBe('[SEII] Novo documento para sua ciência: OFÍCIO Nº 020/2026 – CEMXXXIII/CCM');

    const text = await render(React.createElement(entry.component, data), { plainText: true });
    expect(text).toContain('para a sua ciência');
    expect(text).toContain('OFÍCIO Nº 020/2026 – CEMXXXIII/CCM');
  });
});