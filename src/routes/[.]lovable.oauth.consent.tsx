import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthResult = { data: { redirect_url?: string; redirect_to?: string; client?: { name?: string; redirect_uri?: string }; scope?: string } | null; error: { message: string } | null };
type OAuthApi = { getAuthorizationDetails(id: string): Promise<OAuthResult>; approveAuthorization(id: string): Promise<OAuthResult>; denyAuthorization(id: string): Promise<OAuthResult> };
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({ meta: [{ title: "Autorizar conexão — SEII GCM" }, { name: "description", content: "Autorize um assistente a acessar o SEII GCM com sua conta." }, { property: "og:title", content: "Autorizar conexão — SEII GCM" }, { property: "og:description", content: "Autorização de integração do SEII GCM." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "" }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Pedido de autorização inválido.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { next: location.pathname + location.searchStr } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    const { data: s } = await supabase.auth.getSession();
    return { details: data, email: s.session?.user.email ?? "" };
  },
  component: Consent,
  errorComponent: ({ error }) => <main className="mx-auto max-w-md p-8 text-primary-foreground">Não foi possível carregar este pedido de autorização: {error instanceof Error ? error.message : String(error)}</main>,
});

function Consent() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nome = details?.client?.name ?? "Um aplicativo";
  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve ? await oauth().approveAuthorization(authorization_id) : await oauth().denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("O servidor de autorização não retornou um destino."); return; }
    window.location.href = target;
  }
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4 rounded-xl bg-card p-8 text-card-foreground shadow-paper">
        <h1 className="text-xl font-bold">Conectar {nome} ao SEII GCM</h1>
        <p className="text-sm">Conta: <b>{email}</b></p>
        {details?.client?.redirect_uri && <p className="break-all text-xs text-muted-foreground">Destino: {details.client.redirect_uri}</p>}
        <p className="text-sm">{nome} poderá consultar seus documentos e processos do SEII como você. Seu perfil básico e e-mail serão compartilhados.</p>
        <p className="text-xs text-muted-foreground">Isso não ignora as permissões da sua conta.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2"><Button disabled={busy} onClick={() => decide(true)}>Autorizar</Button><Button variant="outline" disabled={busy} onClick={() => decide(false)}>Cancelar conexão</Button></div>
      </div>
    </main>
  );
}
