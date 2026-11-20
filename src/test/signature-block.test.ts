import { describe, it, expect } from 'vitest';
import { blocoValido, itensUnicos, type BlockItem } from '../lib/signature-block';
const item: BlockItem = { documento_id: 'doc-1', versao: 2, modo: 'autor', titulo: 'Ofício' };
describe('blocos de assinatura', () => {
  it('preserva a versão revisada', () => { expect(itensUnicos([item])[0]?.versao).toBe(2); });
  it('não aceita duplicatas', () => { expect(blocoValido([item, item])).toBe(false); });
  it('solicitação recebida exige vínculo explícito', () => { expect(blocoValido([{ ...item, modo: 'solicitacao' }])).toBe(false); expect(blocoValido([{ ...item, modo: 'solicitacao', solicitacao_id: 'req-1' }])).toBe(true); });
});