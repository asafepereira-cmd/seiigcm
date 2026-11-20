import { describe, it, expect } from 'vitest';
import { TIPOS_DOCUMENTO, modeloTipo } from '@/lib/tipos-documento';
describe('catálogo de tipos', () => {
  it('inclui tipos do SEI', () => { for (const t of ['Ofício','Memorando','Edital','Despacho','Portaria','Ata','Certidão']) expect(TIPOS_DOCUMENTO).toContain(t); });
  it('despacho tem modelo padrão', () => { expect(modeloTipo('Despacho')?.corpo).toContain('Encaminho'); });
});
