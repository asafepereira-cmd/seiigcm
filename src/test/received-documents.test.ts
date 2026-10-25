import { describe, it, expect } from 'vitest';
import { acoesDocumentoRecebido } from '@/lib/document-access';
import { identidadeAssinatura } from '@/lib/signature-identity';

describe('documentos recebidos', () => {
  it('não permite alterar, excluir ou encaminhar recebidos em qualquer estado', () => {
    const a = acoesDocumentoRecebido('deferimento', null);
    expect([a.editar, a.excluir, a.encaminhar]).toEqual([false, false, false]);
    expect([a.visualizar, a.comentar, a.exportar]).toEqual([true, true, true]);
  });
  it('assina apenas deferimento ainda pendente', () => {
    expect(acoesDocumentoRecebido('deferimento', null).assinar).toBe(true);
    expect(acoesDocumentoRecebido('ciencia', null).assinar).toBe(false);
    expect(acoesDocumentoRecebido('deferimento', '2026-10-25').assinar).toBe(false);
  });
});
describe('identidade do carimbo', () => {
  it('inclui gestora administrativa mesmo sem nome gravado na solicitação antiga', () => {
    expect(identidadeAssinatura({ gestora: 'administrativa', nome: null }).nome).toBe('ADRIANA ROSADO MAIA OLIVEIRA DOMINGUES');
  });
  it('preserva identidade informada pelo assinante', () => {
    expect(identidadeAssinatura({ gestora: 'user:1', nome: 'Maria Silva', cargo: 'Diretora' }).nome).toBe('Maria Silva');
  });
});