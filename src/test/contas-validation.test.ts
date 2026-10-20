import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    let validate: (input: unknown) => unknown = input => input;
    const chain = {
      middleware: () => chain,
      inputValidator: (validator: typeof validate) => { validate = validator; return chain; },
      handler: () => (input: unknown) => validate(input),
    };
    return chain;
  },
}));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));

import { alterarEmail, alterarSenha } from '../lib/contas.functions';
const validateEmail = alterarEmail as unknown as (input: unknown) => unknown;
const validatePassword = alterarSenha as unknown as (input: unknown) => unknown;
const id = '00000000-0000-4000-8000-000000000001';

describe('alteração de credenciais independente da configuração de setor', () => {
  it('aceita e-mail sem campos de setor', () => {
    expect(validateEmail({ id, email: 'conta@example.com' })).toEqual({ id, email: 'conta@example.com' });
    expect(() => validateEmail({ id, email: 'inválido' })).toThrow();
  });
  it('aceita senha sem campos de setor e mantém limite mínimo', () => {
    expect(validatePassword({ id, password: 'teste-seguro-123' })).toEqual({ id, password: 'teste-seguro-123' });
    expect(() => validatePassword({ id, password: 'curta' })).toThrow();
  });
});