import { describe, it, expect } from 'vitest';
import { aplicarModelo, conteudoModelo, tipoLivre } from '../lib/document-models';
import { documentoSemDestinatario, modeloGravacao } from '../lib/documento';
import { TIPOS_DOCUMENTO, modeloTipo } from '../lib/tipos-documento';
describe('termos e contratos no editor comum', () => {
  for (const tipo of ['Termo', 'Contrato']) {
    it(`${tipo} está no catálogo e não tem minuta imposta`, () => { expect(TIPOS_DOCUMENTO).toContain(tipo); expect(tipoLivre(tipo)).toBe(true); expect(modeloTipo(tipo)).toBeUndefined(); });
    it(`${tipo} não exige destinatário`, () => { expect(documentoSemDestinatario(tipo)).toBe(true); });
  }
  it('modelo não copia número, identidade ou assunto', () => {
    const source = { ...modeloGravacao(15), corpo: 'Texto da unidade', assunto: 'Tema original', assinante: 'Outro autor' };
    const target = { ...modeloGravacao(27), assinante: 'Titular atual', assunto: '' };
    const result = aplicarModelo(target, conteudoModelo(source));
    expect(result.numero).toBe(27); expect(result.assinante).toBe('Titular atual'); expect(result.assunto).toBe(''); expect(result.corpo).toBe('Texto da unidade');
  });
});