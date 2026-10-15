import { supabase } from "@/integrations/supabase/client";
import type { Despacho } from "./documento";

export type GestoraKey = "pedagogica" | "administrativa";

export type AssinaturaGestora = {
  gestora: GestoraKey;
  decisao: string | null;
  observacoes: string;
  assinadoEm: string | null;
  imagem?: string | undefined;
};

export type ExtrasPDF = {
  emitidoEm?: string | null;
  verificarUrl?: string;
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

function novoToken() {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
}

export async function enviarParaAssinatura(documentoId: string, gestoras: GestoraKey[], emitidoEm: string | null) {
  const { data: existentes } = await supabase.from("solicitacoes_assinatura").select("gestora").eq("documento_id", documentoId);
  const ja = new Set((existentes ?? []).map(e => e.gestora));
  const novas = gestoras.filter(g => !ja.has(g)).map(gestora => ({ documento_id: documentoId, gestora, token: novoToken() }));
  if (novas.length) {
    const { error } = await supabase.from("solicitacoes_assinatura").insert(novas);
    if (error) throw error;
  }
  const { error } = await supabase.from("documentos").update({
    status: "enviado", emitido_em: emitidoEm ?? new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", documentoId);
  if (error) throw error;
}

export async function carregarSolicitacoes(documentoId: string) {
  const { data } = await supabase.from("solicitacoes_assinatura")
    .select("gestora, token, decisao, observacoes, assinado_em").eq("documento_id", documentoId);
  return data ?? [];
}

export async function carregarExtras(documentoId: string): Promise<ExtrasPDF> {
  const [{ data: doc }, sols, { data: imgs }] = await Promise.all([
    supabase.from("documentos").select("emitido_em").eq("id", documentoId).maybeSingle(),
    carregarSolicitacoes(documentoId),
    supabase.from("assinaturas_gestoras").select("gestora, imagem"),
  ]);
  if (!doc?.emitido_em) return {};
  const imagem = new Map((imgs ?? []).map(i => [i.gestora, i.imagem]));
  return {
    emitidoEm: doc.emitido_em,
    verificarUrl: `${window.location.origin}/verificar/${documentoId}`,
    assinaturas: sols.map(s => ({
      gestora: s.gestora as GestoraKey, decisao: s.decisao, observacoes: s.observacoes, assinadoEm: s.assinado_em,
      imagem: s.assinado_em ? imagem.get(s.gestora) : undefined,
    })),
  };
}
