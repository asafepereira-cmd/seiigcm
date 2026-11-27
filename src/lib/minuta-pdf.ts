import { dataExtenso } from './documento';
import { GOVERNO_ESTADUAL, LEMA_ESTADUAL } from './document-identity';
import type { MinutaFisica } from './minutas';

async function imagemBase64(src: string) {
  const resposta = await fetch(src);
  if (!resposta.ok) throw new Error('Não foi possível carregar o brasão.');
  const blob = await resposta.blob();
  return new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(blob); });
}

export async function gerarMinutaPDF(minuta: MinutaFisica, salvar = true) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const [brasao, fonteResposta] = await Promise.all([imagemBase64('/brand/governo.png'), fetch('/fonts/bookman-header.ttf')]);
  if (!fonteResposta.ok) throw new Error('Não foi possível carregar a fonte do cabeçalho.');
  const bytes = new Uint8Array(await fonteResposta.arrayBuffer());
  let binario = ''; bytes.forEach(byte => { binario += String.fromCharCode(byte); });
  pdf.addFileToVFS('bookman-header.ttf', btoa(binario)); pdf.addFont('bookman-header.ttf', 'bookman', 'bold');
  const largura = 170, esquerda = 20, centro = 105, limite = 278, alturaLinha = 12 * 25.4 / 72 * 1.26;
  let y = 53;
  const cabecalho = () => {
    pdf.addImage(brasao, 'PNG', 94, 8, 22, 25, undefined, 'FAST');
    pdf.setFont('bookman', 'bold'); pdf.setFontSize(12); pdf.text(GOVERNO_ESTADUAL, centro, 38, { align: 'center' });
    pdf.setFont('times', 'italic'); pdf.text(`“${LEMA_ESTADUAL}”`, centro, 43, { align: 'center' });
  };
  const garantir = (altura: number) => { if (y + altura > limite) { pdf.addPage(); cabecalho(); y = 53; } };
  cabecalho();
  pdf.setFont('times', 'normal'); pdf.setFontSize(12);
  pdf.text(`Boa Vista - ${dataExtenso(minuta.data)}`, 190, y, { align: 'right' }); y += 12;
  pdf.setFont('times', 'bold');
  pdf.splitTextToSize(`MINUTA PARA ASSINATURA FÍSICA\n${minuta.titulo}`, largura).forEach((linha: string) => { garantir(7); pdf.text(linha, centro, y, { align: 'center' }); y += 6; });
  y += 4;
  const justificar = (linha: string) => {
    const palavras = linha.trim().split(/\s+/);
    if (palavras.length < 2) { pdf.text(linha, esquerda, y); return; }
    const total = palavras.reduce((soma, palavra) => soma + pdf.getTextWidth(palavra), 0);
    const espaco = (largura - total) / (palavras.length - 1); let x = esquerda;
    palavras.forEach(palavra => { pdf.text(palavra, x, y); x += pdf.getTextWidth(palavra) + espaco; });
  };
  pdf.setFont('times', 'normal');
  minuta.conteudo.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).forEach(paragrafo => {
    paragrafo.split('\n').forEach(trecho => {
      const linhas = pdf.splitTextToSize(trecho, largura) as string[];
      linhas.forEach((linha, indice) => { garantir(alturaLinha); if (indice < linhas.length - 1) justificar(linha); else pdf.text(linha, esquerda, y); y += alturaLinha; });
    });
    y += alturaLinha * 0.6;
  });
  const paginas = pdf.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    pdf.setPage(pagina); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
    pdf.text('MINUTA.SEII.CEMXXXIII — SEM NUMERAÇÃO OFICIAL', esquerda, 292);
    pdf.text(`Página ${pagina} de ${paginas}`, 190, 292, { align: 'right' });
  }
  if (salvar) await pdf.save(`MINUTA_${minuta.titulo.replace(/[^A-Z0-9]+/gi, '_').slice(0, 70)}.pdf`, { returnPromise: true });
  return pdf;
}
