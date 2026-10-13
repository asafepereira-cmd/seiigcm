import { describe, expect, it } from "vitest";
import { assinantesDespacho, modeloGravacao } from "@/lib/documento";

describe("Página complementar de despacho", () => {
  it("não inclui despacho por padrão nem em documentos antigos", () => {
    expect(modeloGravacao(1).despacho).toBeUndefined();
    expect(assinantesDespacho(undefined)).toEqual([]);
  });
  it("seleciona apenas a gestora pedagógica", () => {
    expect(assinantesDespacho("pedagogica")).toEqual([
      { nome: "NUBIA PAULO DA COSTA ANDRADE", cargo: "Gestora Pedagógica do CEM XXIII" },
    ]);
  });
  it("seleciona apenas a gestora administrativa", () => {
    expect(assinantesDespacho("administrativa")).toEqual([
      { nome: "ADRIANA ROSADO MAIA OLIVEIRA DOMINGUES", cargo: "Gestora Administrativa do CEM XXIII" },
    ]);
  });
  it("inclui ambas, administrativa antes da pedagógica", () => {
    expect(assinantesDespacho("ambas").map((gestora) => gestora.nome)).toEqual([
      "ADRIANA ROSADO MAIA OLIVEIRA DOMINGUES", "NUBIA PAULO DA COSTA ANDRADE",
    ]);
  });
});