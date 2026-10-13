import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { gerarPDF } from "@/lib/pdf";
import { numeroFormatado, type Documento } from "@/lib/documento";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Gerador de Ofícios CCM" },
      { name: "description", content: "Documentos já emitidos pela Coordenação de Comunicação e Mídia." },
      { property: "og:title", content: "Histórico — Gerador de Ofícios CCM" },
      { property: "og:description", content: "Documentos já emitidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Historico,
});

type Row = { id: string; assunto: string; created_at: string; dados: Documento };

function Historico() {
  const { ready } = useRequireSession();
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = () =>
    supabase
      .from("documentos")
      .select("id, assunto, created_at, dados")
      .order("ano", { ascending: false })
      .order("numero", { ascending: false })
      .then(({ data }) => setRows((data as unknown as Row[]) ?? []));

  useEffect(() => {
    if (ready) load();
  }, [ready]);

  if (!ready) return null;
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-primary">Documentos emitidos</h1>
        {rows === null ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground">Nenhum documento salvo ainda.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
                <div className="mr-auto min-w-0">
                  <p className="font-serif font-bold">{numeroFormatado(r.dados)}</p>
                  <p className="truncate text-sm text-muted-foreground">{r.assunto}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/" search={{ id: r.id }}>
                      <Pencil className="h-4 w-4" /> Editar
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => gerarPDF(r.dados)}>
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Excluir"
                    onClick={async () => {
                      if (!confirm("Excluir este documento?")) return;
                      await supabase.from("documentos").delete().eq("id", r.id);
                      toast.success("Excluído");
                      load();
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
