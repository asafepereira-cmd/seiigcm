import { supabase } from "@/integrations/supabase/client";

/** IDs of accounts a document was already forwarded to (recipients and user signers). */
export function idsEncaminhados(destinatarios: { user_id: string }[], solicitacoes: { gestora: string }[]) {
  const ids = new Set(destinatarios.map(d => d.user_id));
  for (const s of solicitacoes) if (s.gestora.startsWith("user:")) ids.add(s.gestora.slice(5));
  return Array.from(ids);
}

export async function carregarEncaminhados(documentoId: string) {
  const [d, s] = await Promise.all([
    supabase.from("documento_destinatarios").select("user_id").eq("documento_id", documentoId),
    supabase.from("solicitacoes_assinatura").select("gestora").eq("documento_id", documentoId),
  ]);
  return idsEncaminhados(d.data ?? [], s.data ?? []);
}
