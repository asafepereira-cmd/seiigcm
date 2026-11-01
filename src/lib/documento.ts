import type { RichNode } from "./rich-text";

export type Participante = { nome: string; funcao: string };

export type Despacho = "pedagogica" | "administrativa" | "ambas";

export const GESTORAS = {
  pedagogica: { nome: "NUBIA PAULO DA COSTA ANDRADE", cargo: "Gestora Pedagógica do CEM XXIII" },
  administrativa: { nome: "ADRIANA ROSADO MAIA OLIVEIRA DOMINGUES", cargo: "Gestora Administrativa do CEM XXIII" },
};

export function assinantesDespacho(opcao?: Despacho) {
  if (opcao === "ambas") return [GESTORAS.administrativa, GESTORAS.pedagogica];
  if (opcao === "administrativa") return [GESTORAS.administrativa];
  if (opcao === "pedagogica") return [GESTORAS.pedagogica];
  return [];
}

export type Documento = {
  setor?: string;
  tipo: string;
  editalQualificador?: string;
  numero: number;
  ano: number;
  sigla: string;
  cidade: string;
  data: string; // yyyy-mm-dd
  para: string;
  de: string;
  assunto: string;
  vocativo: string;
  corpo: string;
  corpoFormatado?: RichNode | undefined;
  fotos?: { src: string; legenda: string; largura: number; altura: number }[];
  tituloLista: string;
  lista: Participante[];
  fecho: string;
  assinante: string;
  cargo: string;
  assinaturaPng?: string;
  despacho?: Despacho;
  processo?: { numero: number; ano: number; tema: string };
};

export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function dataExtenso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

export function numeroFormatado(doc: Pick<Documento, "tipo" | "numero" | "ano" | "sigla">) {
  return `${doc.tipo.toUpperCase()} Nº ${String(doc.numero).padStart(3, "0")}/${doc.ano} – ${doc.sigla}`;
}

export function processoFormatado(processo: { numero: number; ano: number }) {
  return `PROCESSO INTERNO ${String(processo.numero).padStart(3, "0")}/${processo.ano}`;
}

export function identificacaoDocumento(doc: Documento) {
  if (doc.tipo === 'Edital') return `EDITAL${doc.editalQualificador?.trim() ? ` ${doc.editalQualificador.trim().toUpperCase()}` : ''} ${String(doc.numero).padStart(3, '0')}/${doc.ano} - ${doc.sigla}`;
  return doc.processo ? `${doc.tipo.toUpperCase()} ${String(doc.numero).padStart(3, "0")} - ${processoFormatado(doc.processo)}` : numeroFormatado(doc);
}

export function numeroValido(numero: number) {
  return Number.isSafeInteger(numero) && numero > 0;
}

export function documentoSemDestinatario(tipo: string) { return ['edital','termo'].includes(tipo.toLocaleLowerCase('pt-BR')); }

export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function modeloGravacao(numero: number, titular?: {nome: string; funcao: string}): Documento {
  return {
    tipo: "Ofício",
    numero,
    ano: new Date().getFullYear(),
    sigla: "CEMXXXIII/CCM",
    cidade: "Boa Vista",
    data: hojeISO(),
    para: "",
    de: titular ? `${titular.nome} — ${titular.funcao}` : "Coordenação de Comunicação e Mídia do CEMXXXIII",
    assunto: "",
    vocativo: "",
    corpo: "",
    tituloLista: "Equipe envolvida",
    lista: [],
    fecho: "Sem mais para o momento, coloco-me à disposição para quaisquer esclarecimentos.",
    assinante: titular?.nome ?? "ASAFE PEREIRA DA SILVA FELIX",
    cargo: titular?.funcao ?? "Coordenador de Comunicação e Mídia - CEM XXXIII",
  };
}

export function siglaSetor(setor: string) {
  const ignorar = new Set(["de","da","do","das","dos","e","cem","xxxiii","cemxxxiii"]);
  const iniciais = setor.split(/\s+/).filter(w => w && !ignorar.has(w.toLowerCase())).map(w => w.charAt(0).toUpperCase()).join(".");
  return `CEMXXXIII/${iniciais || "SETOR"}`;
}
