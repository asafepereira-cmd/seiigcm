export const NOME_ESCOLA = 'COLÉGIO ESTADUAL MILITARIZADO FERNANDO GRANGEIRO DE MENEZES';

export const LEMA_ESTADUAL = 'Amazônia: patrimônio dos brasileiros';
export const GOVERNO_ESTADUAL = 'Governo do Estado de Roraima';
export const VALIDACAO_ASSINATURA = 'conforme portaria interna de legislação da plataforma SEII CEMXXXIII';

export function corrigirNome(nome: string) {
  const separado = nome.replace(/silvafelix/gi, match => match === match.toUpperCase() ? 'SILVA FELIX' : 'Silva Felix');
  return separado.trim().toUpperCase() === 'ASAFE PEREIRA DA SILVA FELIX' ? 'ASAFE PEREIRA DA SILVA FELIX' : separado;
}

export function identidadeEmissor(documento: { assinante?: string; cargo?: string }, painel?: { nome?: string; funcao?: string } | null) {
  const institucional = (cargo?: string) => cargo?.trim() && !/^(administrador|admin|emissor)$/i.test(cargo.trim()) ? cargo.trim() : '';
  return { nome: corrigirNome(painel?.nome?.trim() || documento.assinante?.trim() || ''), funcao: institucional(documento.cargo) || institucional(painel?.funcao) };
}