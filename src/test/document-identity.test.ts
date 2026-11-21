import { describe, it, expect } from 'vitest';
import { LEMA_ESTADUAL, NOME_ESCOLA, corrigirNome } from '../lib/document-identity';
import { HEADER } from '../lib/pdf';
import { identidadeAssinatura } from '../lib/signature-identity';
describe('identidade institucional', () => {
  it('mantém o nome oficial completo da escola', () => expect(NOME_ESCOLA).toBe('COLÉGIO ESTADUAL MILITARIZADO FERNANDO GRANGEIRO DE MENEZES'));
  it('separa Silva Felix nas assinaturas antigas', () => expect(identidadeAssinatura({ gestora:'emissor:a', nome:'ASAFE PEREIRA DA SILVAFELIX' }).nome).toBe('ASAFE PEREIRA DA SILVA FELIX'));
  it('não altera os demais nomes', () => expect(corrigirNome('Maria Silva')).toBe('Maria Silva'));
  it('ordena o cabeçalho padrão do Governo de Roraima', () => expect(HEADER.map((l) => l.texto)).toEqual([
    'Governo do Estado de Roraima',
    `“${LEMA_ESTADUAL}”`,
  ]));
  it('destaca o lema estadual em itálico', () => expect(HEADER[1]).toEqual({ texto: `“${LEMA_ESTADUAL}”`, italico: true }));
});