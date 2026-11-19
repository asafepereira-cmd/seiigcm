import { describe, it, expect } from 'vitest';
import { NOME_ESCOLA, corrigirNome } from '../lib/document-identity';
import { identidadeAssinatura } from '../lib/signature-identity';
describe('identidade institucional', () => {
  it('mantém o nome oficial completo da escola', () => expect(NOME_ESCOLA).toBe('COLÉGIO ESTADUAL MILITARIZADO FERNANDO GRANGEIRO DE MENEZES'));
  it('separa Silva Felix nas assinaturas antigas', () => expect(identidadeAssinatura({ gestora:'emissor:a', nome:'ASAFE PEREIRA DA SILVAFELIX' }).nome).toBe('ASAFE PEREIRA DA SILVA FELIX'));
  it('não altera os demais nomes', () => expect(corrigirNome('Maria Silva')).toBe('Maria Silva'));
});