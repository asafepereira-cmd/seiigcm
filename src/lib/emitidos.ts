export const STATUS_DOCUMENTO = {
  desenvolvendo: { label: "Desenvolvendo", className: "document-status-developing" },
  enviado: { label: "Enviado", className: "document-status-sent" },
  assinado: { label: "Assinado", className: "document-status-signed" },
} as const;

export type StatusDocumento = keyof typeof STATUS_DOCUMENTO;

export function isStatusDocumento(value: string): value is StatusDocumento {
  return Object.prototype.hasOwnProperty.call(STATUS_DOCUMENTO, value);
}

export function ordenarEmitidos<T extends { tipo: string; ano: number; numero: number; created_at: string }>(rows: T[]): T[] {
  const memorando = (tipo: string) => tipo.trim().toLocaleLowerCase("pt-BR").startsWith("memo") ? 1 : 0;
  return [...rows].sort((a, b) =>
    memorando(a.tipo) - memorando(b.tipo) || b.ano - a.ano || b.numero - a.numero || b.created_at.localeCompare(a.created_at),
  );
}