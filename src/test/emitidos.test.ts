import { describe, expect, it } from "vitest";
import { isStatusDocumento, ordenarEmitidos } from "@/lib/emitidos";

const row = (tipo: string, numero: number, ano = 2026) => ({ tipo, numero, ano, created_at: "2026-10-14T00:00:00Z" });

describe("documentos emitidos", () => {
  it("ordena numeração do maior para o menor", () => {
    expect(ordenarEmitidos([row("Ofício", 3), row("Ofício", 12), row("Ofício", 7)]).map(r => r.numero)).toEqual([12, 7, 3]);
  });
  it("prioriza anos recentes dentro do tipo", () => {
    expect(ordenarEmitidos([row("Ofício", 100, 2025), row("Ofício", 1, 2026)]).map(r => r.ano)).toEqual([2026, 2025]);
  });
  it("mantém memorandos por último mesmo com ano ou número maior", () => {
    const rows = [row("Memorando", 999, 2027), row("Ofício", 1, 2025), row("MEMORANDO", 5), row("Memorando", 8)];
    expect(ordenarEmitidos(rows).map(r => [r.tipo, r.numero])).toEqual([["Ofício", 1], ["Memorando", 999], ["Memorando", 8], ["MEMORANDO", 5]]);
    expect(rows[0].numero).toBe(999);
  });
  it("aceita somente os três status definidos", () => {
    expect(["desenvolvendo", "enviado", "assinado"].every(isStatusDocumento)).toBe(true);
    expect(isStatusDocumento("excluido")).toBe(false);
    expect(isStatusDocumento("toString")).toBe(false);
  });
});