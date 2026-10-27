import { GESTORAS } from './documento';

export function identidadeAssinatura<T extends { gestora: string; nome?: string | null; cargo?: string | null }>(s: T): Omit<T, 'nome' | 'cargo'> & { nome: string; cargo: string } {
  const gestora = GESTORAS[s.gestora as keyof typeof GESTORAS];
  return { ...s, nome: s.nome?.trim() || gestora?.nome || 'Signatário identificado', cargo: s.cargo?.trim() || gestora?.cargo || '' };
}