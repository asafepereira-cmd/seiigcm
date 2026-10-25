import { GESTORAS } from './documento';

export function identidadeAssinatura(s: { gestora: string; nome?: string | null; cargo?: string | null }) {
  const gestora = GESTORAS[s.gestora as keyof typeof GESTORAS];
  return { ...s, nome: s.nome?.trim() || gestora?.nome || 'Signatário identificado', cargo: s.cargo?.trim() || gestora?.cargo || '' };
}