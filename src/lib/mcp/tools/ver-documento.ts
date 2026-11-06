import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "ver_documento",
  title: "Ver documento",
  description: "Mostra o conteúdo de um documento do SEII pelo seu id.",
  inputSchema: { id: z.string().uuid().describe("Id do documento.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("documentos").select("id,status,dados").eq("id", id).maybeSingle();
    if (error || !data) throw new ToolError("Documento não encontrado ou sem acesso.");
    const d = (data.dados ?? {}) as Record<string, unknown>;
    const texto = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
    const documento = { id: data.id, situacao: data.status, tipo: texto("tipo"), numero: Number(d["numero"] ?? 0), ano: Number(d["ano"] ?? 0), para: texto("para"), de: texto("de"), assunto: texto("assunto"), corpo: texto("corpo"), assinante: texto("assinante") };
    return { content: [{ type: "text", text: JSON.stringify(documento) }], structuredContent: { documento } };
  },
});
