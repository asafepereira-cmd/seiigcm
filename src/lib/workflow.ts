export type Finalidade = 'deferimento' | 'ciencia';
export function decisaoValida(finalidade: Finalidade, decisao: string) {
  return finalidade === 'ciencia' ? decisao === 'ciente' : ['deferido', 'indeferido'].includes(decisao);
}
export function oficioValido(tipo: string, assinaturas: {gestora: string; decisao: string | null; assinado_em: string | null}[]) {
  return ['OFÍCIO','OFICIO'].includes(tipo.toUpperCase()) && assinaturas.length > 0 && assinaturas.every(s => s.assinado_em && s.decisao !== 'indeferido') && assinaturas.some(s => ['pedagogica','administrativa'].includes(s.gestora) && s.decisao === 'deferido');
}
export function textoExportacao(painel: string, iso: string) {
  const d = new Date(iso);
  return `Salvo em PDF por: ${painel} no dia ${d.toLocaleDateString('pt-BR',{timeZone:'America/Boa_Vista'})} às ${d.toLocaleTimeString('pt-BR',{timeZone:'America/Boa_Vista',hour:'2-digit',minute:'2-digit'})} via S.E.I.I GCM - CEM XXXIII.`;
}
export function decisaoLabel(d: string | null) {return d === 'ciente' ? 'Ciência declarada' : d === 'indeferido' ? 'Indeferido' : 'Deferido';}