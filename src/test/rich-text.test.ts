import { describe, expect, it } from "vitest";
import { fontStyle, plainToRich, richParagraphs, richToPlain, wrapRichParagraph } from "@/lib/rich-text";

describe("Formatação do texto principal", () => {
  it("mantém documentos anteriores e parágrafos sem formatação", () => {
    const text = "Texto antigo\nsegunda linha\n\nOutro parágrafo";
    expect(richToPlain(plainToRich(text))).toBe(text);
  });
  it.each([ ["bold", "bold"], ["italic", "italic"], ["underline", "normal"] ])("preserva a marca %s", (mark, style) => {
    const runs = richParagraphs({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Asafe", marks: [{ type: mark }] }] }] })[0];
    expect(runs?.[0]?.[mark as "bold" | "italic" | "underline"]).toBe(true);
    if (!runs?.[0]) throw new Error("Texto ausente");
    expect(fontStyle(runs[0])).toBe(style);
  });
  it("combina negrito e itálico e deixa a última linha natural", () => {
    const run = { text: "um dois três quatro", bold: true, italic: true, underline: true };
    expect(fontStyle(run)).toBe("bolditalic");
    const lines = wrapRichParagraph([run], 9, (piece) => piece.text.length);
    expect(lines.map((line) => line.runs.map((piece) => piece.text).join(""))).toEqual(["um dois", "três", "quatro"]);
    expect(lines.map((line) => line.justify)).toEqual([true, true, false]);
    expect(lines.flatMap((line) => line.runs).every((piece) => piece.bold && piece.italic && piece.underline)).toBe(true);
  });
});