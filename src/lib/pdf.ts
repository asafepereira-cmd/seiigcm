import type { Documento } from "./documento";
import { assinantesDespacho, dataExtenso, numeroFormatado } from "./documento";
import { dataHora, gestorasDoDespacho, SISTEMA, type ExtrasPDF } from "./assinaturas-eletronicas";
import { GESTORAS } from "./documento";
import { fontStyle, richParagraphs, wrapRichParagraph, type TextRun } from "./rich-text";
import { textoExportacao } from "./workflow";
import { supabase } from "@/integrations/supabase/client";

async function nomePainelAtual(): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return "Usuário não identificado";
  const { data: p } = await supabase.from("paineis").select("nome").eq("user_id", u.user.id).maybeSingle();
  return p?.nome ?? "Asafe Pereira da Silva Felix — Coordenação de Comunicação e Mídia";
}

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
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const [brasao, midia] = await Promise.all([loadImage("/brand/brasao.png"), loadImage("/brand/midia.png")]);
  const W = 210, ML = 20, MR = 20, TW = W - ML - MR, BOTTOM = 280;
  const PT_MM = 25.4 / 72;
  const LH = 12 * PT_MM * 1.26;
  const HEADER_LH = 8.5 * PT_MM * 1.13;
  const SIGNATURE_LH = 12 * PT_MM * 0.89;

  const header = (despacho = false) => {
    pdf.addImage(brasao, "PNG", 12, 7, 20, 20);
    pdf.addImage(midia, "PNG", 170, 11, 28, 10);
    pdf.setFont("times", "bold");
    pdf.setFontSize(8.5);
    HEADER.forEach((l, i) => pdf.text(despacho && i === 3 ? 'GRUPAMENTO DE COMUNICAÇÃO E MÍDIA - "CEMXXXIII NA MÍDIA"' : l, 105, 12 + i * HEADER_LH, { align: "center" }));
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
  pdf.text(numeroFormatado(doc), ML, y);
  y += 6;
  pdf.setFontSize(12);
  pdf.text(`${doc.cidade} - ${dataExtenso(doc.data)}`, W - MR, y, { align: "right" });
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
  labelLine("Para:", doc.para, true);
  labelLine("De:", doc.de, true);
  y += LH * 0.7;
  labelLine("Assunto:", doc.assunto, true);
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
    const measure = (run: TextRun) => { pdf.setFont("times", fontStyle(run)); return pdf.getTextWidth(run.text); };
    richParagraphs(doc.corpoFormatado).forEach((runs) => {
      wrapRichParagraph(runs, TW, measure).forEach((line) => {
        ensure(LH);
        const naturalWidth = line.runs.reduce((sum, run) => sum + measure(run), 0);
        const spaces = line.runs.reduce((sum, run) => sum + (run.text === " " ? 1 : 0), 0);
        const extra = line.justify && spaces ? Math.max(0, (TW - naturalWidth) / spaces) : 0;
        let x = ML;
        line.runs.forEach((run) => {
          pdf.setFont("times", fontStyle(run));
          const width = measure(run) + (run.text === " " ? extra : 0);
          pdf.text(run.text, x, y);
          if (run.underline) { pdf.setLineWidth(0.2); pdf.line(x, y + 0.7, x + width, y + 0.7); }
          x += width;
        });
        y += LH;
      });
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

  if (doc.fecho.trim()) paragraph(doc.fecho.trim());

  const assinaturaEmissor = doc.assinaturaPng || (extras.emitidoEm ? extras.emissorImagem : undefined);
  ensure(assinaturaEmissor ? 45 : 30);
  if (assinaturaEmissor) {
    const image = pdf.getImageProperties(assinaturaEmissor);
    const scale = Math.min(70 / image.width, 22 / image.height);
    const width = image.width * scale, height = image.height * scale;
    y += 6;
    pdf.addImage(assinaturaEmissor, "PNG", (W - width) / 2, y, width, height);
    y += height + 1;
  } else {
    y += 14;
  }
  pdf.setLineWidth(0.2);
  pdf.line(65, y, 145, y);
  y += 5;
  pdf.setFont("times", "bold");
  pdf.text(doc.assinante.toUpperCase(), 105, y, { align: "center" });
  y += SIGNATURE_LH;
  pdf.text(doc.cargo, 105, y, { align: "center" });

  // Carimbo eletrônico: quadro com ícone de selo e texto.
  const carimbo = (text: string, top: number) => {
    pdf.setFont("times", "normal");
    pdf.setFontSize(9);
    const lines: string[] = pdf.splitTextToSize(text, TW - 18);
    const h = Math.max(13, lines.length * 4 + 5);
    pdf.setDrawColor(30, 58, 138);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(ML, top, TW, h, 2, 2);
    const cx = ML + 7, cy = top + h / 2;
    pdf.setFillColor(30, 58, 138);
    pdf.circle(cx, cy, 4, "F");
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(0.7);
    pdf.line(cx - 2, cy, cx - 0.5, cy + 1.6);
    pdf.line(cx - 0.5, cy + 1.6, cx + 2.2, cy - 1.6);
    pdf.setDrawColor(0, 0, 0);
    pdf.setTextColor(20, 30, 60);
    pdf.text(lines, ML + 14, top + (h - lines.length * 4) / 2 + 3, { lineHeightFactor: 1.15 });
    pdf.setTextColor(0, 0, 0);
    pdf.setLineWidth(0.2);
    return h;
  };
  const qr = extras.verificarUrl ? await (await import("qrcode")).toDataURL(extras.verificarUrl, { margin: 0, width: 240 }) : null;
  const blocoQR = (top: number) => {
    if (!qr || !extras.verificarUrl) return;
    pdf.addImage(qr, "PNG", ML, top, 20, 20);
    pdf.setFont("times", "normal");
    pdf.setFontSize(8.5);
    pdf.text(["A autenticidade do documento pode ser conferida no endereço:", extras.verificarUrl, `informando o código verificador do documento. Sistema ${SISTEMA}`], ML + 24, top + 7, { lineHeightFactor: 1.3 });
  };

  if (extras.emitidoEm) {
    const { data, hora } = dataHora(extras.emitidoEm);
    pdf.setFontSize(12);
    y += 8;
    ensure(18);
    y += carimbo(`Documento assinado eletronicamente por ${doc.assinante.toUpperCase()}, ${doc.cargo}, em ${data}, às ${hora}, conforme portaria interna de legalização do ${SISTEMA}.`, y);
  }

  const gestoras = assinantesDespacho(doc.despacho);
  if (!gestoras.length && qr) { y += 4; ensure(22); blocoQR(y); }
  if (gestoras.length) {
    pdf.addPage();
    header(true);
    pdf.setLineWidth(0.2);
    pdf.rect(12, 43, 186, 123);
    pdf.setFont("times", "bold");
    pdf.setFontSize(12);
    pdf.text("Despacho / Gestão", 20, 52);
    pdf.setFont("times", "normal");
    const chaves = doc.despacho ? gestorasDoDespacho(doc.despacho) : [];
    const assinadas = chaves.map(k => extras.assinaturas?.find(a => a.gestora === k && a.assinadoEm));
    const marca = (d: string) => assinadas.filter(a => a?.decisao === d).length ? "X" : " ";
    pdf.text([`(${marca("deferido")}) Deferido`, `(${marca("indeferido")}) Indeferido`], 20, 60, { lineHeightFactor: 1 });
    pdf.text("Observações:", 20, 73);
    const obs = assinadas.flatMap(a => a?.observacoes.trim() ? [(chaves.length > 1 ? `${GESTORAS[a.gestora as keyof typeof GESTORAS]?.nome.split(" ")[0] ?? ""}: ` : "") + a.observacoes.trim()] : []).join(" ");
    if (obs) {
      pdf.setFontSize(10);
      pdf.text((pdf.splitTextToSize(obs, 166) as string[]).slice(0, 6), 21, 77.2, { lineHeightFactor: 1.2 });
      pdf.setFontSize(12);
    }
    for (let i = 0; i < 6; i++) pdf.line(20, 78 + i * 4.3, 188, 78 + i * 4.3);
    gestoras.forEach((gestora, i) => {
      const center = gestoras.length === 2 ? (i === 0 ? 63 : 147) : 105;
      const lineWidth = gestoras.length === 2 ? 73 : 82;
      const img = assinadas[i]?.imagem;
      if (img) {
        const p = pdf.getImageProperties(img);
        const sc = Math.min((lineWidth - 6) / p.width, 18 / p.height);
        pdf.addImage(img, "PNG", center - (p.width * sc) / 2, 145 - p.height * sc, p.width * sc, p.height * sc);
      }
      pdf.line(center - lineWidth / 2, 146, center + lineWidth / 2, 146);
      pdf.setFont("times", "bold");
      pdf.setFontSize(10);
      const maxWidth = gestoras.length === 2 ? 82 : 130;
      const nameSize = Math.min(10, 10 * maxWidth / pdf.getTextWidth(gestora.nome));
      pdf.setFontSize(nameSize);
      pdf.text(gestora.nome, center, 150.5, { align: "center" });
      pdf.setFontSize(10);
      pdf.text(gestora.cargo, center, 154, { align: "center" });
    });
    let yy = 172;
    assinadas.forEach((a, i) => {
      if (!a?.assinadoEm) return;
      const g = gestoras[i];
      if (!g) return;
      const { data, hora } = dataHora(a.assinadoEm);
      yy += carimbo(`Documento assinado eletronicamente por ${g.nome}, ${g.cargo}, em ${data}, às ${hora}, conforme portaria interna de legalização do ${SISTEMA}. Decisão: ${a.decisao === "indeferido" ? "Indeferido" : "Deferido"}.`, yy) + 3;
    });
    y = yy;
    blocoQR(yy + 2);
  }

  const outras = extras.assinaturas?.filter(a => a.nome && a.assinadoEm) ?? [];
  if (outras.length) {
    y += 28;
    for (const a of outras) {
      if (!a.assinadoEm) continue;
      const {data,hora} = dataHora(a.assinadoEm);
      const text = `Documento assinado eletronicamente por ${a.nome}, ${a.cargo ?? ""}, em ${data}, às ${hora}, via ${SISTEMA}. Decisão: ${a.decisao === "indeferido" ? "Indeferido" : "Deferido"}.${a.observacoes ? " Observações: " + a.observacoes : ""}`;
      pdf.setFontSize(9);
      ensure(Math.max(13,(pdf.splitTextToSize(text,TW-18) as string[]).length*4+5)+3);
      y += carimbo(text,y)+3;
    }
    ensure(24); blocoQR(y+2);
  }

  ensure(12);
  pdf.setFont("times", "bold");
  pdf.setFontSize(7);
  pdf.text(textoExportacao(await nomePainelAtual(), new Date().toISOString()), ML, y + 6);

  const nome = `${doc.tipo.toUpperCase().replace(/[^A-Z]/gi, "_")}_${String(doc.numero).padStart(3, "0")}_${doc.ano}.pdf`;
  if (salvar) {
    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  return pdf;
}
