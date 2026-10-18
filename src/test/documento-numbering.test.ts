import { describe, it, expect } from 'vitest';
import { modeloGravacao, identificacaoDocumento, numeroValido } from '@/lib/documento';

describe('numeração e documentos internos', () => {
  it('aceita a numeração manual 008', () => {
    const doc = modeloGravacao(8);
    expect(doc.numero).toBe(8);
    expect(numeroValido(8)).toBe(true);
    expect(numeroValido(0)).toBe(false);
    expect(numeroValido(2.5)).toBe(false);
  });
  it('novos documentos começam com campos solicitados vazios', () => {
    const doc = modeloGravacao(8);
    expect(doc.para).toBe('');
    expect(doc.assunto).toBe('');
    expect(doc.vocativo).toBe('');
    expect(doc.corpo).toBe('');
  });
  it('vincula ofício 008 ao processo interno 002/2026', () => {
    const doc = { ...modeloGravacao(8), processo: { numero: 2, ano: 2026, tema: 'evento baile de máscaras' } };
    expect(identificacaoDocumento(doc)).toBe('OFÍCIO 008 - PROCESSO INTERNO 002/2026');
  });
});