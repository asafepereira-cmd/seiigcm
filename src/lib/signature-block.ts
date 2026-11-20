export type BlockItem = { documento_id: string; versao: number; modo: 'autor' | 'solicitacao'; solicitacao_id?: string; titulo: string };
export function itensUnicos(items: BlockItem[]) {
  const keys = new Set<string>();
  return items.filter(item => { const key = `${item.documento_id}:${item.modo}:${item.solicitacao_id ?? ''}`; if (keys.has(key)) return false; keys.add(key); return true; });
}
export function blocoValido(items: BlockItem[]) {
  return items.length > 0 && items.length <= 50 && itensUnicos(items).length === items.length && items.every(i => Number.isInteger(i.versao) && i.versao > 0 && (i.modo !== 'solicitacao' || !!i.solicitacao_id));
}
