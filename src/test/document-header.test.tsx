import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DocumentPreview } from '../components/DocumentPreview';
import { DispatchPreview } from '../components/DispatchPreview';
import { LEMA_ESTADUAL } from '../lib/document-identity';
import type { Documento } from '../lib/documento';

const doc: Documento = {
  tipo: 'Ofício',
  numero: 1,
  ano: 2026,
  sigla: 'CEMXXXIII/CCM',
  cidade: 'Boa Vista',
  data: '2026-11-20',
  para: 'Destinatário',
  de: 'Remetente',
  assunto: 'Assunto de teste',
  vocativo: 'Senhor(a),',
  corpo: 'Corpo de teste.',
  tituloLista: '',
  lista: [],
  fecho: 'Atenciosamente,',
  assinante: 'ASAFE PEREIRA DA SILVA FELIX',
  cargo: 'Coordenador',
};

function linhasHeader(el: Element) {
  return el.innerHTML
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

describe('cabeçalho padrão nas prévias', () => {
  it('mostra governo, lema, secretaria, escola e setor em ordem', () => {
    const { container } = render(<DocumentPreview doc={doc} />);
    const header = container.querySelector('.document-header-text');
    expect(header).not.toBeNull();
    if (!header) throw new Error('Cabeçalho ausente');
    expect(linhasHeader(header)).toBe(
      `Governo do Estado de Roraima “${LEMA_ESTADUAL}”`,
    );
  });

  it('mantém o lema em itálico na prévia', () => {
    const { container } = render(<DocumentPreview doc={doc} />);
    const italico = container.querySelector('.document-header-text .italic');
    expect(italico?.textContent).toBe(`“${LEMA_ESTADUAL}”`);
  });

  it('repete o lema na folha de despacho', () => {
    const { container } = render(<DispatchPreview opcao="pedagogica" />);
    const heading = container.querySelector('.document-header-text');
    expect(heading?.textContent).toContain(LEMA_ESTADUAL);
    if (!heading) throw new Error('Cabeçalho ausente');
    expect(linhasHeader(heading)).toBe(`Governo do Estado de Roraima “${LEMA_ESTADUAL}”`);
  });
});
