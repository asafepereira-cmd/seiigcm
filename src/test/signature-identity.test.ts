import { describe, expect, it } from 'vitest';
import { exigeIdentificacaoAssinatura, gestoraDaConta } from '../lib/signature-identity';

describe('identificação de gestoras na assinatura', () => {
  it('gestora pedagógica não preenche nome ou função, mesmo em painel de setor', () => {
    expect(exigeIdentificacaoAssinatura('user:pedagogica', 'setor', ['pedagogica'])).toBe(false);
    expect(gestoraDaConta('user:pedagogica', ['pedagogica'])).toBe('pedagogica');
  });
  it('gestora administrativa não preenche nome ou função, mesmo em painel de setor', () => {
    expect(exigeIdentificacaoAssinatura('user:administrativa', 'setor', ['administrativa'])).toBe(false);
    expect(gestoraDaConta('user:administrativa', ['administrativa'])).toBe('administrativa');
  });
  it('links antigos de gestão mantêm identificação automática', () => {
    expect(exigeIdentificacaoAssinatura('pedagogica', 'setor', [])).toBe(false);
    expect(exigeIdentificacaoAssinatura('administrativa', 'setor', [])).toBe(false);
  });
  it('outros setores continuam exigindo identificação pessoal', () => {
    expect(exigeIdentificacaoAssinatura('user:setor', 'setor', ['emissor'])).toBe(true);
  });
});