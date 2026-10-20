import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import seiiLogo from "@/assets/seii-transparent.png";

export function AppHeader() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(false);
  const [nome, setNome] = useState("");
  const [mostrarAviso, setMostrarAviso] = useState(false);
  useEffect(() => { supabase.from("user_roles").select("role").then(async ({ data }) => {
    const roles = (data ?? []).map(r => r.role as string);
    setAdmin(roles.includes("admin"));
    let completo = roles.includes("admin") ? "Asafe Felix" : roles.includes("pedagogica") ? "Nubia Andrade" : roles.includes("administrativa") ? "Adriana Domingues" : "";
    if (!roles.includes("admin")) {
      const { data: u } = await supabase.auth.getUser();
      setMostrarAviso(!!u.user && u.user.email?.toLowerCase() !== "ca.gestaosei@gmail.com");
      const { data: p } = await supabase.from("paineis").select("nome,pode_emitir,ativo").eq("user_id", u.user?.id ?? "").maybeSingle();
      completo = p?.nome ?? completo;
    }
    const partes = completo.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    setNome(partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : partes[0] ?? "");
  }); }, []);
  return (
    <>
    <header className="sticky top-0 z-20 border-b bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link to="/home" className="mr-auto flex items-center gap-2" aria-label="SEII GCM — início">
          <img src={seiiLogo} alt="seii! Sistema eletrônico interno de informações do CEM XXXIII" className="h-8 w-auto object-contain" />
        </Link>
        <nav className="flex items-center flex-wrap justify-end gap-1 text-xs sm:text-sm">
          <Link to="/home" className="rounded-md px-2 py-1.5 hover:bg-primary-foreground/10" activeProps={{ className: "bg-primary-foreground/15" }}>Home</Link>
          <Link to="/historico" className="rounded-md px-2 py-1.5 hover:bg-primary-foreground/10" activeProps={{ className: "bg-primary-foreground/15" }}>Docs</Link>
          <Link to="/processos" className="rounded-md px-2 py-1.5 hover:bg-primary-foreground/10" activeProps={{ className: "bg-primary-foreground/15" }}>Processos</Link>
          <Link to="/painel" className="rounded-md px-2 py-1.5 hover:bg-primary-foreground/10" activeProps={{ className: "bg-primary-foreground/15" }}>{admin ? "Admin" : "Painel"}</Link>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Sair"
            className="hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </div>
      <p className="sr-only">{nome ? `Olá! ${nome}` : ""}</p>
    </header>
    {mostrarAviso && <aside role="status" className="border-b bg-card px-4 py-4 text-card-foreground">
      <div className="mx-auto max-w-7xl space-y-2 text-sm">
        <p className="font-bold">Sistema em desenvolvimento e atualização — retorno em 22/09.</p>
        <p>As assinaturas serão realizadas normalmente por meio de link, se necessário, somente para documentos emitidos pela Coordenação de Comunicação e Mídia (CCM).</p>
        <p>Dúvidas? Entre em contato com o desenvolvedor: <a className="font-semibold underline" href="tel:+5595991120610">(95) 991120610</a>.</p>
      </div>
    </aside>}
    </>
  );
}

export function AppFooter() {
  return (
    <footer className="mt-auto px-4 py-8 text-center text-xs text-primary-foreground/80">
      <p>Desenvolvido por:</p>
      <p className="font-bold">Grupamento de Comunicação e mídia do CEM XXXIII</p>
      <p className="mt-2 border-t border-primary-foreground/20 pt-2">S.E.I.I GCM CEMXXXIII © - todos os direitos reservados</p>
    </footer>
  );
}
