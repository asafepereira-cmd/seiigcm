import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createFirstAccount, getSetupStatus } from "@/lib/server.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import brasao from "@/assets/brasao-interface.png";

export const Route = createFileRoute("/login")({
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: "/home" }));
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
      navigate({ to: "/home" });
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
          <img src={brasao} alt="Brasão CEM XXXIII" className="h-20 w-20 object-contain" />
          <h1 className="mt-4 text-2xl font-bold text-card-foreground">SEII GCM</h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">Coordenação de Comunicação e Mídia · Acesso restrito</p>
        </div>
        {setup && (
          <p className="mb-4 rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
            Primeiro acesso: defina o e-mail e a senha que serão compartilhados pela equipe.
          </p>
        )}
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
      </div>
    </main>
  );
}
