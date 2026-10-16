import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Funções públicas: o token secreto do link é a única credencial da gestora.
const tokenInput = z.object({ token: z.string().min(20).max(100) });

export const getSignRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req } = await supabaseAdmin.from("solicitacoes_assinatura")
      .select("gestora, signatario_nome, signatario_funcao, termo, decisao, observacoes, assinado_em, documento_id").eq("token", data.token).maybeSingle();
    if (!req) return { found: false as const };
    const { data: doc } = await supabaseAdmin.from("documentos").select("dados").eq("id", req.documento_id).maybeSingle();
    if (!doc) return { found: false as const };
    const d = doc.dados as Record<string, unknown>;
    return {
      found: true as const,
      gestora: req.gestora as "pedagogica" | "administrativa",
      nome: req.signatario_nome, cargo: req.signatario_funcao, termo: req.termo,
      decisao: req.decisao, observacoes: req.observacoes, assinadoEm: req.assinado_em,
      doc: {
        tipo: String(d["tipo"] ?? ""), numero: Number(d["numero"] ?? 0), ano: Number(d["ano"] ?? 0), sigla: String(d["sigla"] ?? ""),
        assunto: String(d["assunto"] ?? ""), para: String(d["para"] ?? ""), corpo: String(d["corpo"] ?? ""),
        assinante: String(d["assinante"] ?? ""),
      },
    };
  });

const signInput = tokenInput.extend({
  decisao: z.enum(["deferido", "indeferido"]),
  observacoes: z.string().max(600),
});

export const signDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("registrar_assinatura", {_token:data.token,_decisao:data.decisao,_observacoes:data.observacoes});
    if(error) throw new Error("Link inválido ou documento já assinado.");
    return { ok: true };
  });

export const getVerificacao = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: doc } = await supabaseAdmin.from("documentos").select("dados, emitido_em, status").eq("id", data.id).maybeSingle();
    if (!doc || !doc.emitido_em) return { found: false as const };
    const { data: sols } = await supabaseAdmin.from("solicitacoes_assinatura").select("gestora, signatario_nome, signatario_funcao, decisao, assinado_em").eq("documento_id", data.id);
    const d = doc.dados as Record<string, unknown>;
    return {
      found: true as const,
      tipo: String(d["tipo"] ?? ""), numero: Number(d["numero"] ?? 0), ano: Number(d["ano"] ?? 0), sigla: String(d["sigla"] ?? ""),
      assunto: String(d["assunto"] ?? ""), assinante: String(d["assinante"] ?? ""), cargo: String(d["cargo"] ?? ""),
      emitidoEm: doc.emitido_em, status: doc.status,
      assinaturas: (sols ?? []).map(s => ({ nome:s.signatario_nome, cargo:s.signatario_funcao, gestora: s.gestora as "pedagogica" | "administrativa", decisao: s.decisao, assinadoEm: s.assinado_em })),
    };
  });
