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

import { criarGestora } from '../lib/painel.functions';
const validate = criarGestora as unknown as (input: unknown) => { email: string };

describe('cadastro de painel sem validação de formato do e-mail', () => {
  it('aceita um endereço informado sem exigir formato de e-mail', () => {
    expect(validate({ email: 'endereço informado', password: 'senha-painel-123', role: 'pedagogica' }).email).toBe('endereço informado');
  });
});