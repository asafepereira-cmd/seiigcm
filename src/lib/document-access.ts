export function podeEditarDocumento(admin: boolean, userId: string, doc: {criado_por: string | null; status: string; analise_admin: boolean}) {
  return admin || doc.criado_por === userId;
}

export function podeComentarDocumento(status: string) {
  return status === 'desenvolvendo';
}

export function acoesDocumentoRecebido(finalidade: string, assinadoEm: string | null) {
  return { editar: false, excluir: false, encaminhar: false, visualizar: true, comentar: true, exportar: true, assinar: finalidade === 'deferimento' && !assinadoEm };
}