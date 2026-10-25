import { supabase } from "@/integrations/supabase/client";
import type { Despacho } from "./documento";

export type GestoraKey = "pedagogica" | "administrativa";

export type AssinaturaGestora = {
  gestora: string;
  nome?: string | null;
  cargo?: string | null;
  decisao: string | null;
  observacoes: string;
  assinadoEm: string | null;
  imagem?: string | undefined;
};

export type ExtrasPDF = {
  emitidoEm?: string | null;
  verificarUrl?: string;
  emissorImagem?: string | undefined;
  assinaturas?: AssinaturaGestora[];
};

export function gestorasDoDespacho(opcao: Despacho): GestoraKey[] {
  return opcao === "ambas" ? ["administrativa", "pedagogica"] : [opcao];
}

export function dataHora(iso: string) {
  const d = new Date(iso);
  const opts = { timeZone: "America/Boa_Vista" } as const;
  return {
    data: d.toLocaleDateString("pt-BR", opts),
    hora: d.toLocaleTimeString("pt-BR", { ...opts, hour: "2-digit", minute: "2-digit" }),
  };
}

export const SISTEMA = "S.E.I.GCM-CEMXXXIII";

export async function enviarParaAssinatura(documentoId: string, gestoras: GestoraKey[], _emitidoEm: string | null, extras: {nome:string;funcao:string;user_id?:string}[] = [], prioridade = "normal", prazo: string | null = null, termo = "") {
  const {error} = await supabase.rpc("enviar_documento",{_id:documentoId,_gestoras:gestoras,_extras:extras,_prioridade:prioridade,_prazo:prazo as string,_termo:termo});
  if(error) throw error;
}

export async function carregarSolicitacoes(documentoId: string) {
  const { data, error } = await supabase.from("solicitacoes_assinatura")
    .select("id, gestora, signatario_nome, signatario_funcao, versao, token, decisao, observacoes, assinado_em").eq("documento_id", documentoId);
  if (error) throw error;
  return data ?? [];
}

export async function carregarExtras(documentoId: string): Promise<ExtrasPDF> {
  const [{ data: doc, error }, sols, { data: imgs }] = await Promise.all([
    supabase.from("documentos").select("emitido_em,versao").eq("id", documentoId).maybeSingle(),
    carregarSolicitacoes(documentoId),
    supabase.from("assinaturas_gestoras").select("gestora, imagem"),
  ]);
  if (error || !doc) throw error ?? new Error('Documento indisponível');
  const imagem = new Map((imgs ?? []).map(i => [i.gestora, i.imagem]));
  return {
    emitidoEm: doc.emitido_em,
    emissorImagem: imagem.get("admin"),
    verificarUrl: `${window.location.origin}/verificar/${documentoId}`,
    assinaturas: sols.filter(s=>s.versao===doc.versao).map(s => ({
      nome:s.signatario_nome, cargo:s.signatario_funcao, gestora: s.gestora, decisao: s.decisao, observacoes: s.observacoes, assinadoEm: s.assinado_em,
      imagem: s.assinado_em ? imagem.get(s.gestora) : undefined,
    })),
  };
}
