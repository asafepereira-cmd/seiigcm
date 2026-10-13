import type { Documento } from "./documento";
import { assinantesDespacho, dataExtenso, numeroFormatado } from "./documento";

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

export async function gerarPDF(doc: Documento, salvar = true) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const [brasao, midia] = await Promise.all([loadImage("/brand/brasao.png"), loadImage("/brand/midia.png")]);
  const W = 210, ML = 20, MR = 20, TW = W - ML - MR, BOTTOM = 280, LH = 6.2;

  const header = (despacho = false) => {
    pdf.addImage(brasao, "PNG", 12, 7, 20, 20);
    pdf.addImage(midia, "PNG", 170, 11, 28, 10);
    pdf.setFont("times", "bold");
    pdf.setFontSize(8.5);
    HEADER.forEach((l, i) => pdf.text(despacho && i === 3 ? 'GRUPAMENTO DE COMUNICAÇÃO E MÍDIA - "CEMXXXIII NA MÍDIA"' : l, 105, 12 + i * 4, { align: "center" }));
    pdf.setLineWidth(0.2);
    pdf.line(46, 28, 158, 28);
  };
  header();
  let y = 40;
  const ensure = (h: number) => {
    if (y + h > BOTTOM) {
      pdf.addPage();
      header();
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
    if (justify && rest.length) pdf.text(first, ML + lw, y, { align: "justify", maxWidth: TW - lw });
    else pdf.text(first, ML + lw, y);
    y += LH;
    rest.forEach((ln, i) => {
      ensure(LH);
      if (justify && i < rest.length - 1) pdf.text(ln, ML, y, { align: "justify", maxWidth: TW });
      else pdf.text(ln, ML, y);
      y += LH;
    });
  };

  pdf.setFontSize(12);
  labelLine("Para:", doc.para);
  labelLine("De:", doc.de);
  y += LH * 0.7;
  labelLine("Assunto:", doc.assunto, true);
  y += LH * 0.7;

  const paragraph = (text: string) => {
    pdf.setFont("times", "normal");
    const lines: string[] = pdf.splitTextToSize(text, TW);
    lines.forEach((ln, i) => {
      ensure(LH);
      if (i < lines.length - 1) pdf.text(ln, ML, y, { align: "justify", maxWidth: TW });
      else pdf.text(ln, ML, y);
      y += LH;
    });
    y += LH * 0.7;
  };

  if (doc.vocativo.trim()) paragraph(doc.vocativo.trim());
  doc.corpo
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
      lines.forEach((ln) => {
        ensure(LH);
        pdf.text(ln, ML + 1, y);
        y += LH;
      });
    });
    y += LH * 0.7;
  }

  if (doc.fecho.trim()) paragraph(doc.fecho.trim());

  ensure(doc.assinaturaPng ? 45 : 30);
  if (doc.assinaturaPng) {
    const image = pdf.getImageProperties(doc.assinaturaPng);
    const scale = Math.min(70 / image.width, 22 / image.height);
    const width = image.width * scale, height = image.height * scale;
    y += 6;
    pdf.addImage(doc.assinaturaPng, "PNG", (W - width) / 2, y, width, height);
    y += height + 1;
  } else {
    y += 14;
  }
  pdf.setLineWidth(0.2);
  pdf.line(65, y, 145, y);
  y += 5;
  pdf.setFont("times", "bold");
  pdf.text(doc.assinante.toUpperCase(), 105, y, { align: "center" });
  y += 5;
  pdf.text(doc.cargo, 105, y, { align: "center" });

  const gestoras = assinantesDespacho(doc.despacho);
  if (gestoras.length) {
    pdf.addPage();
    header(true);
    pdf.setLineWidth(0.2);
    pdf.rect(12, 43, 186, 123);
    pdf.setFont("times", "bold");
    pdf.setFontSize(12);
    pdf.text("Despacho / Gestão", 20, 52);
    pdf.setFont("times", "normal");
    pdf.text(["( ) Deferido", "( ) Indeferido"], 20, 60, { lineHeightFactor: 1 });
    pdf.text("Observações:", 20, 73);
    for (let i = 0; i < 6; i++) pdf.line(20, 78 + i * 4.3, 188, 78 + i * 4.3);
    gestoras.forEach((gestora, i) => {
      const center = gestoras.length === 2 ? (i === 0 ? 63 : 147) : 105;
      const lineWidth = gestoras.length === 2 ? 73 : 82;
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
  }

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
