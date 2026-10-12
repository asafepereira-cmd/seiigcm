import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Primeiro acesso: só permite criar a conta compartilhada se ainda não existir nenhuma.
export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error(error.message);
  return { needsSetup: data.users.length === 0 };
});

export const createFirstAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email().max(255), password: z.string().min(8).max(128) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (list && list.users.length > 0) throw new Error("O acesso já foi configurado.");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const reviewInput = z.object({
  tipo: z.string().max(40),
  para: z.string().max(300),
  assunto: z.string().max(1000),
  vocativo: z.string().max(200),
  corpo: z.string().max(8000),
  fecho: z.string().max(500),
  instrucoes: z.string().max(1000).optional(),
});

const reviewOutput = z.object({
  assunto: z.string(),
  vocativo: z.string(),
  corpo: z.string(),
  fecho: z.string(),
});

export const reviewWithAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reviewInput.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("IA não configurada.");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system:
        "Você é revisor de redação oficial brasileira (Manual de Redação da Presidência). Corrija ortografia, gramática e pontuação e reescreva o texto de forma formal, clara, impessoal e concisa, adequada a um " +
        data.tipo +
        " de um colégio estadual militarizado. Preserve todos os fatos, nomes, datas, horários, locais e siglas. Não invente informações. Separe parágrafos do corpo com uma linha em branco. Não inclua cabeçalho, data, destinatário nem assinatura no corpo. Se um campo vier vazio, sugira um texto adequado (vocativo e fecho padrão).",
      prompt: JSON.stringify({ ...data, instrucoes: data.instrucoes || "" }),
      output: Output.object({ schema: reviewOutput }),
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    try {
      return await result.output;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("402")) throw new Error("Créditos de IA esgotados.");
      if (msg.includes("429")) throw new Error("Muitas solicitações. Tente novamente em instantes.");
      throw new Error("Não foi possível revisar com IA: " + msg);
    }
  });
