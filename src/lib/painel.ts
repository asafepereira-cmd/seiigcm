export type ItemPrioridade = { prioridade: string; prazo: string | null };
export function solicitacoesDoUsuario<T extends { gestora: string }>(rows: T[], roles: string[], userId: string): T[] {
  const destinos = new Set([...roles, 'user:' + userId]);
  return rows.filter(r => destinos.has(r.gestora));
}
export function ordenarPainel<T extends ItemPrioridade>(rows: T[]): T[] {
  return [...rows].sort((a,b) => (a.prioridade === 'alta' ? 0 : 1) - (b.prioridade === 'alta' ? 0 : 1) || (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999'));
}
export function todasAssinadas(rows: { assinado_em: string | null }[]) { return rows.length > 0 && rows.every(r => r.assinado_em !== null); }
