import { describe, expect, it } from 'vitest';
import { numeroSeguinte } from '../lib/document-numbering';

describe('sequência independente por tipo e ano', () => {
  const rows = [{ tipo: 'OFÍCIO', ano: 2026, numero: 7 }, { tipo: 'Memorando', ano: 2026, numero: 3 }, { tipo: 'Termo', ano: 2025, numero: 12 }];
  it('primeiro termo é 001 mesmo após sete ofícios', () => {
    expect(numeroSeguinte(rows, 'Termo', 2026)).toBe(1);
  });
  it('ofício segue apenas os ofícios do ano', () => {
    expect(numeroSeguinte([...rows, { tipo: 'Termo', ano: 2026, numero: 99 }], 'Ofício', 2026)).toBe(8);
  });
  it('memorando mantém sua própria sequência', () => {
    expect(numeroSeguinte(rows, 'Memorando', 2026)).toBe(4);
  });
});