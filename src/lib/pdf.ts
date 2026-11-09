import type { Documento } from "./documento";
import { dataExtenso, identificacaoDocumento } from "./documento";
import { dataHora, type ExtrasPDF } from "./assinaturas-eletronicas";
import { fontStyle, richBlocks, wrapRichParagraph, type TextRun } from "./rich-text";
import signatureSeal from '@/assets/seii-signature-seal.png.asset.json';
import { identidadeAssinatura } from './signature-identity';

async function loadImage(src: string): Promise<string> {
  const res = await fetch(src);
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
}

const HEADER = [
  "GOVERNO DO ESTADO DE RORAIMA",
  "SECRETARIA DE EDUCAÇÃO E DESPORTO",
  "COLÉGIO ESTADUAL MILITARIZADO FERNANDO GRANGEIRO DE MENEZES",
  "COORDENAÇÃO DE COMUNICAÇÃO E MÍDIA DO CEMXXXIII",
];

export async function gerarPDF(doc: Documento, salvar = true, extras: ExtrasPDF = {}) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const [brasao, midia, seal] = await Promise.all([loadImage("/brand/brasao.png"), loadImage(doc.setor ? "/brand/governo.png" : "/brand/midia.png"), loadImage(signatureSeal.url)]);
  const W = 210, ML = 20, MR = 20, TW = W - ML - MR, BOTTOM = 280;
  const PT_MM = 25.4 / 72;
  const LH = 12 * PT_MM * 1.26;
  const HEADER_LH = 8.5 * PT_MM * 1.13;

  const header = () => {
    pdf.addImage(brasao, "PNG", 12, 7, 20, 20, undefined, "FAST");
    if (doc.setor) pdf.addImage(midia, "PNG", 180, 7, 18, 20, undefined, "FAST"); else pdf.addImage(midia, "PNG", 170, 11, 28, 10, undefined, "FAST");
    pdf.setFont("times", "bold");
    pdf.setFontSize(8.5);
    HEADER.forEach((l, i) => pdf.text(i === 3 && doc.setor ? doc.setor.toUpperCase() : l, 105, 12 + i * HEADER_LH, { align: "center" }));
    pdf.setLineWidth(0.2);
    pdf.line(46, 28, 158, 28);
  };
  header();
  let y = 40;
  const ensure = (h: number) => {
    if (y + h > BOTTOM) {
      const font = pdf.getFont();
      const size = pdf.getFontSize();
      pdf.addPage();
      header();
      pdf.setFont(font.fontName, font.fontStyle);
      pdf.setFontSize(size);
      y = 40;
    }
  };

  pdf.setFont("times", "bold");
  pdf.setFontSize(13);
  const identification = pdf.splitTextToSize(identificacaoDocumento(doc), TW) as string[];
  pdf.text(identification, ML, y);
  y += identification.length * 6;
  if (doc.processo) {
    pdf.setFontSize(12);
    const tema = pdf.splitTextToSize(doc.processo.tema, TW) as string[];
    pdf.text(tema, W / 2, y, { align: "center" });
    y += tema.length * 6;
  }
  pdf.setFontSize(12);
  if (doc.tipo !== 'Edital') pdf.text(`${doc.cidade} - ${dataExtenso(doc.data)}`, W - MR, y, { align: "right" });
  y += 13;

  const justifiedLine = (line: string, x: number, width: number) => {
    const words = line.trim().split(/\s+/);
    if (words.length < 2) { pdf.text(line, x, y); return; }
    const total = words.reduce((sum, word) => sum + pdf.getTextWidth(word), 0);
    const gap = (width - total) / (words.length - 1);
    let cursor = x;
    words.forEach((word) => {
      pdf.text(word, cursor, y);
      cursor += pdf.getTextWidth(word) + gap;
    });
  };

  const labelLine = (label: string, value: string, justify = false) => {
    pdf.setFont("times", "bold");
    const lw = pdf.getTextWidth(label + " ");
    pdf.setFont("times", "normal");
    const words = value.trim().split(/\s+/);
    let first = "";
    while (words.length) {
      const word = words[0];
      if (word === undefined || pdf.getTextWidth(first ? first + " " + word : word) > TW - lw) break;
      first = first ? first + " " + word : word;
      words.shift();
    }
    const rest: string[] = words.length ? pdf.splitTextToSize(words.join(" "), TW) : [];
    ensure(LH);
    pdf.setFont("times", "bold");
    pdf.text(label, ML, y);
    pdf.setFont("times", "normal");
    if (justify && rest.length) justifiedLine(first, ML + lw, TW - lw);
    else pdf.text(first, ML + lw, y);
    y += LH;
    rest.forEach((ln, i) => {
      ensure(LH);
      if (justify && i < rest.length - 1) justifiedLine(ln, ML, TW);
      else pdf.text(ln, ML, y);
      y += LH;
    });
  };

  pdf.setFontSize(12);
  if (doc.tipo !== "Edital") {
    labelLine("Para:", doc.para, true);
    labelLine("De:", doc.de, true);
    y += LH * 0.7;
  }
  if (doc.tipo === 'Edital') {
    pdf.setFont('times', 'bold');
    const tema = pdf.splitTextToSize(doc.assunto, TW) as string[];
    for (const line of tema) { ensure(LH); pdf.text(line, W / 2, y, { align: 'center' }); y += LH; }
    pdf.setFont('times', 'normal');
  } else labelLine("Assunto:", doc.assunto, true);
  y += LH * 0.7;

  const paragraph = (text: string) => {
    pdf.setFont("times", "normal");
    const lines: string[] = pdf.splitTextToSize(text, TW);
    lines.forEach((ln, i) => {
      ensure(LH);
      if (i < lines.length - 1) justifiedLine(ln, ML, TW);
      else pdf.text(ln, ML, y);
      y += LH;
    });
    y += LH * 0.7;
  };

  if (doc.vocativo.trim()) paragraph(doc.vocativo.trim());
  if (doc.corpoFormatado) {
    const measure = (run: TextRun) => { pdf.setFont("times", fontStyle(run)); pdf.setFontSize(run.fontSize ?? 12); const w = pdf.getTextWidth(run.text); pdf.setFontSize(12); return w; };
    richBlocks(doc.corpoFormatado).forEach((block) => {
      const left = ML + block.indent * 12.5, width = TW - block.indent * 12.5;
      wrapRichParagraph(block.runs, width, measure).forEach((line) => {
        const lineSize = Math.max(12, ...line.runs.map((r) => r.fontSize ?? 12));
        const lh = LH * lineSize / 12;
        ensure(lh);
        const naturalWidth = line.runs.reduce((sum, run) => sum + measure(run), 0);
        const spaces = line.runs.reduce((sum, run) => sum + (run.text === " " ? 1 : 0), 0);
        const extra = block.align === 'justify' && line.justify && spaces ? Math.max(0, (width - naturalWidth) / spaces) : 0;
        let x = block.align === 'center' ? left + (width - naturalWidth) / 2 : block.align === 'right' ? left + width - naturalWidth : left;
        line.runs.forEach((run) => {
          pdf.setFont("times", fontStyle(run));
          pdf.setFontSize(run.fontSize ?? 12);
          const width = pdf.getTextWidth(run.text) + (run.text === " " ? extra : 0);
          pdf.text(run.text, x, y);
          if (run.underline) { pdf.setLineWidth(0.2); pdf.line(x, y + 0.7, x + width, y + 0.7); }
          x += width;
        });
        pdf.setFontSize(12);
        y += lh;
      });
      if (!block.runs.length) y += LH;
      y += LH * 0.7;
    });
    pdf.setFont("times", "normal");
  } else doc.corpo
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .forEach(paragraph);

  const itens = doc.lista.filter((p) => p.nome.trim());
  if (itens.length) {
    ensure(LH * 2);
    pdf.setFont("times", "bold");
    pdf.text(`${doc.tituloLista || "Participantes"}:`, ML, y);
    y += LH;
    pdf.setFont("times", "normal");
    itens.forEach((p) => {
      const lines: string[] = pdf.splitTextToSize(p.funcao.trim() ? `${p.nome.trim()} – ${p.funcao.trim()}` : p.nome.trim(), TW - 2);
      lines.forEach((ln, i) => {
        ensure(LH);
        if (i < lines.length - 1) justifiedLine(ln, ML + 1, TW - 2);
        else pdf.text(ln, ML + 1, y);
        y += LH;
      });
    });
    y += LH * 0.7;
  }

  const imagem = (f: { src: string; legenda: string; largura: number; altura: number }, rotulo: string, maxH: number) => {
    const ratio = Math.min(TW * 0.8 / f.largura, maxH / f.altura);
    const w = f.largura * ratio, h = f.altura * ratio;
    ensure(h + 6);
    pdf.addImage(f.src, "JPEG", (W - w) / 2, y, w, h, undefined, "FAST");
    y += h + 4;
    const cap = [rotulo, f.legenda].filter(Boolean).join(" – ");
    if (cap) { pdf.setFont("times", "italic"); pdf.setFontSize(10); pdf.text(cap, W / 2, y, { align: "center" }); pdf.setFontSize(12); y += 5; }
  };
  (doc.fotos ?? []).forEach((f) => imagem(f, "", 90));

  if (doc.fecho.trim()) paragraph(doc.fecho.trim());

  if (doc.tipo === 'Edital') {
    ensure(LH * 2);
    pdf.setFont('times', 'bold');
    pdf.text(`${doc.cidade} - ${dataExtenso(doc.data)}`, W - MR, y, { align: 'right' });
    y += LH * 2;
  }

  if (doc.anexos?.length) {
    ensure(LH * 2); pdf.setFont('times', 'bold'); pdf.setFontSize(12); pdf.text('Anexos', ML, y); y += LH;
    doc.anexos.forEach((f, i) => imagem(f, `Anexo ${i + 1}`, 160));
  }

  y += 6;

  // Use the original supplied seal and a ruled, black Times signature block.
  const stampLines = (text: string) => {
    const prefix = 'Documento assinado eletronicamente por ';
    const end = text.indexOf(', em ', prefix.length);
    const runs: TextRun[] = end > 0 ? [
      { text: prefix, bold: false, italic: false, underline: false },
      { text: text.slice(prefix.length, end), bold: true, italic: false, underline: false },
      { text: text.slice(end), bold: false, italic: false, underline: false },
    ] : [{ text, bold: false, italic: false, underline: false }];
    pdf.setFontSize(10);
    return wrapRichParagraph(runs, TW - 30, run => {
      pdf.setFont('times', fontStyle(run));
      return pdf.getTextWidth(run.text);
    });
  };
  const stampHeight = (text: string) => Math.max(26, stampLines(text).length * 4.5 + 8);
  const carimbo = (text: string, top: number) => {
    const lines = stampLines(text);
    const h = Math.max(26, lines.length * 4.5 + 8);
    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(160, 160, 160);
    pdf.setLineWidth(0.2);
    pdf.line(ML, top, W - MR, top);
    pdf.line(ML, top + h, W - MR, top + h);
    pdf.addImage(seal, 'PNG', ML + 1, top + (h - 18) / 2, 26.5, 18);
    lines.forEach((line, i) => {
      let x = ML + 30;
      line.runs.forEach(run => {
        pdf.setFont('times', fontStyle(run));
        pdf.text(run.text, x, top + (h - lines.length * 4.5) / 2 + 3.5 + i * 4.5);
        x += pdf.getTextWidth(run.text);
      });
    });
    pdf.setDrawColor(0, 0, 0);
    return h;
  };
  const qr = extras.verificarUrl ? await (await import("qrcode")).toDataURL(extras.verificarUrl, { margin: 0, width: 240 }) : null;
  const blocoQR = (top: number) => {
    if (!qr || !extras.verificarUrl) return;
    pdf.addImage(qr, "PNG", ML + 1, top + 2, 15, 15);
    pdf.setFont("times", "normal");
    pdf.setFontSize(9);
    const code = new URL(extras.verificarUrl).pathname.split('/').filter(Boolean).pop() ?? '';
    const lines = pdf.splitTextToSize(`A autenticidade do documento pode ser conferida no endereço ${extras.verificarUrl}, informando o código verificador ${code}.`, TW - 21) as string[];
    pdf.text(lines, ML + 21, top + 6, { lineHeightFactor: 1.2 });
    pdf.setDrawColor(160, 160, 160);
    pdf.line(ML, top + 20, W - MR, top + 20);
    pdf.setDrawColor(0, 0, 0);
  };

  if (extras.emitidoEm) {
    const { data, hora } = dataHora(extras.emitidoEm);
    pdf.setFontSize(12);
    y += 8;
    const text = `Documento assinado eletronicamente por ${doc.assinante.toUpperCase()}, ${doc.cargo}, em ${data}, às ${hora}, conforme portaria interna de legalização do S.E.I.I GCM.`;
    ensure(stampHeight(text));
    y += carimbo(text, y);
  }

  const outras = extras.assinaturas?.filter(a => a.assinadoEm).map(identidadeAssinatura) ?? [];
  for (const a of outras) {
    if (!a.assinadoEm) continue;
    const {data,hora} = dataHora(a.assinadoEm);
    const text = `Documento assinado eletronicamente por ${a.nome}, ${a.cargo ?? ""}, em ${data}, às ${hora}, conforme portaria interna de legalização do S.E.I.I GCM.`;
    pdf.setFontSize(9);
    ensure(stampHeight(text)+3);
    y += carimbo(text,y)+3;
  }
  const comentarios = (extras.assinaturas ?? [])
    .filter(a => a.assinadoEm && a.observacoes?.trim())
    .map(a => ({ nome: identidadeAssinatura(a).nome, texto: a.observacoes.trim() }));
  if (comentarios.length) {
    y += 4;
    pdf.setFontSize(10);
    ensure(LH * 2);
    pdf.setFont("times", "bold");
    pdf.text("Comentários dos assinantes:", ML, y);
    y += 5;
    comentarios.forEach(c => {
      pdf.setFont("times", "normal");
      const lines = pdf.splitTextToSize(`${c.nome}: ${c.texto}`, TW) as string[];
      lines.forEach(ln => { ensure(5); pdf.text(ln, ML, y); y += 4.5; });
      y += 1.5;
    });
  }
  if (qr) { y += 4; ensure(23); blocoQR(y); }

  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(0, 0, 0);
    pdf.text("DOC.SEII.CEMXXXIII", ML, 292);
    pdf.text(`Página ${i} de ${pages}`, W - MR, 292, { align: "right" });
  }

  const nome = `${doc.tipo.toUpperCase().replace(/[^A-Z]/gi, "_")}_${String(doc.numero).padStart(3, "0")}_${doc.ano}.pdf`;
  if (salvar) {
    // jsPDF's saver handles Safari's Blob-download fallback and keeps the
    // download URL alive long enough for the browser to finish saving it.
    await pdf.save(nome, { returnPromise: true });
  }
  return pdf;
}
