import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import brasao from "@/assets/brasao-interface.png";

export function AppHeader() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(false);
  useEffect(() => { supabase.from("user_roles").select("role").then(({ data }) => setAdmin(data?.some(r => r.role === "admin") ?? false)); }, []);
  return (
    <header className="sticky top-0 z-20 border-b bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <img src={brasao} alt="Brasão CEM XXXIII" className="h-9 w-9 object-contain" />
        <div className="mr-auto leading-tight">
           <p className="font-sans text-base font-bold sm:text-lg">Gerador de Ofícios</p>
          <p className="hidden text-xs opacity-80 sm:block">CCM · CEM XXXIII</p>
        </div>
        <nav className="flex items-center gap-1 text-sm">
          {admin && <><Link to="/" className="rounded-md px-3 py-1.5 hover:bg-primary-foreground/10" activeProps={{ className: "bg-primary-foreground/15" }} activeOptions={{ exact: true, includeSearch: false }}>
            Novo
          </Link>
          <Link to="/historico" className="rounded-md px-3 py-1.5 hover:bg-primary-foreground/10" activeProps={{ className: "bg-primary-foreground/15" }}>
            Emitidos
          </Link></>}
          <Link to="/painel" className="rounded-md px-2 py-1.5 hover:bg-primary-foreground/10">{admin ? "Admin" : "Painel"}</Link>
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
    </header>
  );
}
