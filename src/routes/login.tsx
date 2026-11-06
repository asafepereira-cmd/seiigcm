import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createFirstAccount, getSetupStatus } from "@/lib/server.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import seiiLogo from "@/assets/seii-transparent.png";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => (typeof s["next"] === "string" ? { next: s["next"] } : {}),
  head: () => ({
    meta: [
      { title: "Entrar — SEII GCM" },
      { name: "description", content: "Acesso restrito ao gerador de ofícios da Coordenação de Comunicação e Mídia." },
      { property: "og:title", content: "Entrar — SEII GCM" },
      { property: "og:description", content: "Acesso restrito ao gerador de ofícios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const destino = next ? oauthReturnPath(next) : null;
  const irDepois = () => destino && destino !== "/" ? window.location.assign(destino) : navigate({ to: "/home" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState(false);
  const [recovering, setRecovering] = useState(false);

  async function submitRecovery(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error("Não foi possível enviar o e-mail de recuperação.");
      toast.success("E-mail de recuperação enviado. Verifique sua caixa de entrada.");
      setRecovering(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao recuperar acesso");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && irDepois());
    getSetupStatus().then((r) => setSetup(r.needsSetup)).catch(() => {});
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (setup) {
        await createFirstAccount({ data: { email, password } });
        toast.success("Acesso criado!");
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error("E-mail ou senha incorretos.");
      irDepois();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-xl border bg-card px-6 py-8 text-card-foreground shadow-paper sm:p-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <h1 className="flex w-full justify-center rounded-md bg-primary p-4"><img src={seiiLogo} alt="SEII — Sistema eletrônico interno de informações" className="h-16 max-w-full object-contain" /></h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">Sistema Interno de Informações do CEMXXXIII · Acesso restrito</p>
        </div>
        {setup && (
          <p className="mb-4 rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
            Primeiro acesso: defina o e-mail e a senha que serão compartilhados pela equipe.
          </p>
        )}
        {recovering ? (
          <form onSubmit={submitRecovery} className="space-y-5">
            <p className="text-sm text-muted-foreground">Informe o e-mail da conta para receber o link de recuperação.</p>
            <div className="space-y-1.5">
              <Label htmlFor="rec-email">E-mail</Label>
              <Input className="h-11 bg-paper text-paper-ink shadow-sm" id="rec-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="h-11 w-full text-base shadow-sm" disabled={loading}>
              {loading ? "Aguarde..." : "Enviar link de recuperação"}
            </Button>
            <button type="button" className="w-full text-center text-sm underline underline-offset-4" onClick={() => setRecovering(false)}>
              Voltar para o login
            </button>
          </form>
        ) : (
        <>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input className="h-11 bg-paper text-paper-ink shadow-sm" id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Senha</Label>
            <Input className="h-11 bg-paper text-paper-ink shadow-sm" id="pw" type="password" required minLength={setup ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="h-11 w-full text-base shadow-sm" disabled={loading}>
            {loading ? "Aguarde..." : setup ? "Criar acesso e entrar" : "Entrar"}
          </Button>
        </form>
        <button type="button" className="mt-4 w-full text-center text-sm underline underline-offset-4" onClick={() => setRecovering(true)}>
          Recuperar acesso
        </button>
        </>
        )}
      </div>
    </main>
  );
}
