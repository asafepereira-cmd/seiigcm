import { expect, it } from 'vitest';
import { cpfValido, podeExportar } from '../lib/sector';
it('setor exporta somente documentos assinados', () => {
  expect(podeExportar('setor', 'desenvolvendo')).toBe(false);
  expect(podeExportar('setor', 'enviado')).toBe(false);
  expect(podeExportar('setor', 'assinado')).toBe(true);
});
it('painéis individuais exportam todos os documentos autorizados',()=>{
  expect(podeExportar('individual','desenvolvendo')).toBe(true);
  expect(podeExportar('individual','enviado')).toBe(true);
  expect(podeExportar('individual','assinado')).toBe(true);
});
it('identificação exige CPF válido', () => {
  expect(cpfValido('111.111.111-11')).toBe(false);
  expect(cpfValido('529.982.247-25')).toBe(true);
  expect(cpfValido('529.982.247-24')).toBe(false);
});