export const NOME_ESCOLA = 'COLÉGIO ESTADUAL MILITARIZADO FERNANDO GRANGEIRO DE MENEZES';

export function corrigirNome(nome: string) {
  return nome.replace(/silvafelix/gi, match => match === match.toUpperCase() ? 'SILVA FELIX' : 'Silva Felix');
}