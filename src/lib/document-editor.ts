export type SignatarioEditor = { id: string; nome: string; funcao?: string; externo?: boolean };
export type SignatureSelection = { gestora: string; signatario_nome: string | null; signatario_funcao: string | null; versao: number; finalidade: string };

export function signatariosUltimaVersao(rows: SignatureSelection[]) {
  const signers = rows.filter(row => !row.gestora.startsWith('emissor:'));
  const version = Math.max(0, ...signers.map(row => row.versao));
  return signers.filter(row => row.versao === version);
}

export function precisaSalvar(conteudo: unknown, salvo: string, id?: string) {
  return !id || JSON.stringify(conteudo) !== salvo;
}