export type TextMark = { type: string };
export type RichNode = { type: string; text?: string; marks?: TextMark[]; content?: RichNode[] };
export type TextRun = { text: string; bold: boolean; italic: boolean; underline: boolean };

export function plainToRich(text: string): RichNode {
  return { type: "doc", content: text.split(/\n\s*\n/).map((paragraph) => ({
    type: "paragraph",
    content: paragraph.split("\n").flatMap((line, i) => [
      ...(i ? [{ type: "hardBreak" }] : []),
      ...(line ? [{ type: "text", text: line }] : []),
    ]),
  })) };
}

export function richParagraphs(node: RichNode): TextRun[][] {
  return (node.content ?? []).map((paragraph) => (paragraph.content ?? []).flatMap((item) => {
    if (item.type === "hardBreak") return [{ text: "\n", bold: false, italic: false, underline: false }];
    if (item.type !== "text" || !item.text) return [];
    return [{ text: item.text, bold: Boolean(item.marks?.some((mark) => mark.type === "bold")),
      italic: Boolean(item.marks?.some((mark) => mark.type === "italic")),
      underline: Boolean(item.marks?.some((mark) => mark.type === "underline")) }];
  }));
}

export function richToPlain(node: RichNode): string {
  return richParagraphs(node).map((runs) => runs.map((run) => run.text).join("")).join("\n\n");
}

export function fontStyle(run: TextRun) {
  return run.bold ? (run.italic ? "bolditalic" : "bold") : (run.italic ? "italic" : "normal");
}

export type RichLine = { runs: TextRun[]; justify: boolean };
export function wrapRichParagraph(runs: TextRun[], width: number, measure: (run: TextRun) => number): RichLine[] {
  const lines: RichLine[] = [];
  let current: TextRun[] = [];
  let used = 0;
  let pendingSpace: TextRun | undefined;
  let word: TextRun[] = [];
  const flushLine = (justify: boolean) => {
    lines.push({ runs: current, justify }); current = []; used = 0; pendingSpace = undefined;
  };
  const flushWord = () => {
    if (!word.length) return;
    const wordWidth = word.reduce((sum, run) => sum + measure(run), 0);
    const spaceWidth = current.length && pendingSpace ? measure(pendingSpace) : 0;
    if (current.length && used + spaceWidth + wordWidth > width) flushLine(true);
    if (current.length && pendingSpace) { current.push(pendingSpace); used += measure(pendingSpace); }
    // Split oversized words by character so they never cross the right margin.
    for (const run of word) {
      for (const char of run.text) {
        const piece = { ...run, text: char };
        const size = measure(piece);
        if (current.length && used + size > width + 0.001) flushLine(false);
        const last = current.at(-1);
        if (last && last.bold === piece.bold && last.italic === piece.italic && last.underline === piece.underline && last.text !== " ") last.text += char;
        else current.push(piece);
        used += size;
      }
    }
    word = []; pendingSpace = undefined;
  };
  runs.forEach((run) => run.text.split(/(\s+)/).filter(Boolean).forEach((text) => {
    if (/\s/.test(text)) {
      flushWord();
      if (text.includes("\n")) { text.split("\n").slice(1).forEach(() => flushLine(false)); }
      else pendingSpace = { ...run, text: " " };
    } else word.push({ ...run, text });
  }));
  flushWord();
  if (current.length) flushLine(false);
  return lines;
}