export const NOME_ESCOLA = 'COLÉGIO ESTADUAL MILITARIZADO FERNANDO GRANGEIRO DE MENEZES';

export const LEMA_ESTADUAL = 'Amazônia: patrimônio dos brasileiros';
export const GOVERNO_ESTADUAL = 'Governo do Estado de Roraima';
export const VALIDACAO_ASSINATURA = 'conforme portaria interna de legislação da plataforma SEII CEMXXXIII';

export function corrigirNome(nome: string) {
  return nome.replace(/silvafelix/gi, match => match === match.toUpperCase() ? 'SILVA FELIX' : 'Silva Felix');
}