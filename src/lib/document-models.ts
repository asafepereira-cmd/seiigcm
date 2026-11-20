import type { Documento } from './documento';

export const tipoLivre = (tipo: string) => ['termo', 'contrato'].includes(tipo.toLocaleLowerCase('pt-BR'));
export function conteudoModelo(doc: Documento) {
  return { vocativo: doc.vocativo, corpo: doc.corpo, ...(doc.corpoFormatado ? { corpoFormatado: doc.corpoFormatado } : {}), fecho: doc.fecho, tituloLista: doc.tituloLista, lista: doc.lista };
}
export function aplicarModelo(doc: Documento, conteudo: ReturnType<typeof conteudoModelo>): Documento {
  return { ...doc, ...conteudo, corpoFormatado: conteudo.corpoFormatado };
}