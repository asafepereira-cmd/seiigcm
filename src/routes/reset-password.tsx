import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import seiiLogo from "@/assets/seii-transparent.png";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Recuperar acesso — SEII GCM" },
      { name: "description", content: "Defina uma nova senha para acessar o SEII GCM." },
      { property: "og:title", content: "Recuperar acesso — SEII GCM" },
      { property: "og:description", content: "Defina uma nova senha para acessar o SEII GCM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    setRecovery(hash.includes("type=recovery"));
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecovery(true);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error("Não foi possível salvar a nova senha.");
      toast.success("Senha atualizada! Entre com a nova senha.");
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-xl border bg-card px-6 py-8 text-card-foreground shadow-paper sm:p-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <h1 className="flex w-full justify-center rounded-md bg-primary p-4">
            <img src={seiiLogo} alt="SEII — Sistema eletrônico interno de informações" className="h-16 max-w-full object-contain" />
          </h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">Recuperar acesso · Sistema Interno de Informações do CEMXXXIII</p>
        </div>
        {recovery ? (
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="npw">Nova senha</Label>
              <Input className="h-11 bg-paper text-paper-ink shadow-sm" id="npw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpw">Confirmar nova senha</Label>
              <Input className="h-11 bg-paper text-paper-ink shadow-sm" id="cpw" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="h-11 w-full text-base shadow-sm" disabled={loading}>
              {loading ? "Aguarde..." : "Salvar nova senha"}
            </Button>
          </form>
        ) : (
          <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
            Link de recuperação inválido ou expirado. Solicite um novo em "Recuperar acesso" na página de entrada.
          </p>
        )}
        <div className="mt-6 text-center">
          <button type="button" className="text-sm underline underline-offset-4" onClick={() => navigate({ to: "/login" })}>
            Voltar para o login
          </button>
        </div>
      </div>
    </main>
  );
}
