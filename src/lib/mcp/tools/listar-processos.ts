import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "listar_processos",
  title: "Listar processos",
  description: "Lista os processos internos que o usuário conectado pode ver.",
  inputSchema: { limite: z.number().int().min(1).max(100).default(30).describe("Quantidade máxima de processos.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limite }, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("processos").select("id,numero,tema,assunto,encerrado_em,created_at").order("numero", { ascending: false }).limit(limite);
    if (error) throw new ToolError("Não foi possível listar os processos.");
    const processos = (data ?? []).map(p => ({ id: p.id, numero: p.numero, tema: p.tema, assunto: p.assunto, encerrado: !!p.encerrado_em, criado_em: p.created_at }));
    return { content: [{ type: "text", text: JSON.stringify(processos) }], structuredContent: { processos } };
  },
});
