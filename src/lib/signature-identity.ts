import { GESTORAS } from './documento';

export function gestoraDaConta(gestora: string, roles: readonly string[]) {
  if (gestora === 'pedagogica' || roles.includes('pedagogica')) return 'pedagogica';
  if (gestora === 'administrativa' || roles.includes('administrativa')) return 'administrativa';
  return null;
}

export function exigeIdentificacaoAssinatura(gestora: string, tipoPainel: string | undefined, roles: readonly string[]) {
  return tipoPainel === 'setor' && gestoraDaConta(gestora, roles) === null;
}

export function identidadeAssinatura<T extends { gestora: string; nome?: string | null; cargo?: string | null }>(s: T): Omit<T, 'nome' | 'cargo'> & { nome: string; cargo: string } {
  const gestora = GESTORAS[s.gestora as keyof typeof GESTORAS];
  return { ...s, nome: s.nome?.trim() || gestora?.nome || 'Signatário identificado', cargo: s.cargo?.trim() || gestora?.cargo || '' };
}