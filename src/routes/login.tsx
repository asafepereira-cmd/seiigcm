import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createFirstAccount, getSetupStatus } from "@/lib/server.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Gerador de Ofícios CCM" },
      { name: "description", content: "Acesso restrito ao gerador de ofícios da Coordenação de Comunicação e Mídia." },
      { property: "og:title", content: "Entrar — Gerador de Ofícios CCM" },
      { property: "og:description", content: "Acesso restrito ao gerador de ofícios." },
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
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: "/" }));
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
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-paper">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/brand/brasao.png" alt="Brasão CEM XXXIII" className="h-20 w-20" />
          <h1 className="mt-4 text-2xl font-bold text-primary">Gerador de Ofícios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Coordenação de Comunicação e Mídia</p>
        </div>
        {setup && (
          <p className="mb-4 rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
            Primeiro acesso: defina o e-mail e a senha que serão compartilhados pela equipe.
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Senha</Label>
            <Input id="pw" type="password" required minLength={setup ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : setup ? "Criar acesso e entrar" : "Entrar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
