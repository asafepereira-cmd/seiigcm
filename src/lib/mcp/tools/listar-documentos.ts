import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "listar_documentos",
  title: "Listar documentos",
  description: "Lista os documentos do SEII que o usuário conectado pode ver (número, tipo, assunto e situação).",
  inputSchema: { limite: z.number().int().min(1).max(100).default(30).describe("Quantidade máxima de documentos.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limite }, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("documentos").select("id,tipo,numero,ano,assunto,status,created_at").order("created_at", { ascending: false }).limit(limite);
    if (error) throw new ToolError("Não foi possível listar os documentos.");
    const documentos = (data ?? []).map(d => ({ id: d.id, tipo: d.tipo, numero: d.numero, ano: d.ano, assunto: d.assunto, situacao: d.status, criado_em: d.created_at }));
    return { content: [{ type: "text", text: JSON.stringify(documentos) }], structuredContent: { documentos } };
  },
});
