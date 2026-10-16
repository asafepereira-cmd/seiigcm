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
  tipo: string;
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
  tituloLista: string;
  lista: Participante[];
  fecho: string;
  assinante: string;
  cargo: string;
  assinaturaPng?: string;
  despacho?: Despacho;
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
    para: "Gestão Administrativa",
    de: titular ? `${titular.nome} — ${titular.funcao}` : "Coordenação de Comunicação e Mídia do CEMXXXIII",
    assunto: "Solicitação de autorização para gravação",
    vocativo: "Prezada Gestora Administrativa,",
    corpo:
      "Venho, por meio deste, solicitar autorização para a realização de gravação [descreva o conteúdo], no dia [data], às [horário], no(a) [local].\n\nA gravação tem por finalidade [objetivo], sendo conduzida pela equipe da Coordenação de Comunicação e Mídia.",
    tituloLista: "Equipe envolvida",
    lista: [],
    fecho: "Sem mais para o momento, coloco-me à disposição para quaisquer esclarecimentos.",
    assinante: titular?.nome ?? "ASAFE PEREIRA DA SILVA FELIX",
    cargo: titular?.funcao ?? "Coordenador de Comunicação e Mídia - CEM XXXIII",
  };
}
