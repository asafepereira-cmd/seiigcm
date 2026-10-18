import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, FilePlus2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { numeroFormatado, type Documento } from "@/lib/documento";

export const Route = createFileRoute("/processos")({
  head: () => ({
    meta: [
      { title: "Processos — SEII GCM" },
      { name: "description", content: "Abertura e tramitação de processos da Coordenação de Comunicação e Mídia." },
      { property: "og:title", content: "Processos — SEII GCM" },
      { property: "og:description", content: "Abertura e tramitação de processos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Processos,
});

type Processo = { id: string; numero: number; tema: string; assunto: string; descricao: string; acessos: string[]; oficio_id: string | null; aberto_em: string | null; created_at: string };
type Doc = { id: string; dados: Documento; status: string };
type Anexo = { id: string; nome: string; caminho: string; created_at: string };

function Processos() {
  const { ready } = useRequireSession(false);
  const [rows, setRows] = useState<Processo[] | null>(null);
  const [paineis, setPaineis] = useState<{ user_id: string; nome: string }[]>([]);
  const [aberto, setAberto] = useState<Processo | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [novo, setNovo] = useState(false);
  const [tema, setTema] = useState("");
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [acessos, setAcessos] = useState<string[]>([]);
  const [numero, setNumero] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const load = () =>
    supabase.from("processos").select("id,numero,tema,assunto,descricao,acessos,oficio_id,aberto_em,created_at").order("numero", { ascending: false })
      .then(({ data, error }) => {
        if (error) { toast.error("Não foi possível carregar os processos."); return; }
        setRows((data as Processo[]) ?? []);
      });

  useEffect(() => {
    if (!ready) return;
    load();
    supabase.from("paineis").select("user_id,nome").eq("ativo", true).order("nome").then(({ data }) => setPaineis(data ?? []));
  }, [ready]);

  async function abrirDetalhes(p: Processo) {
    setAberto(p); setDocs([]); setAnexos([]);
    const [d, a] = await Promise.all([
      supabase.from("documentos").select("id,dados,status").eq("processo_id", p.id),
      supabase.from("processo_anexos").select("id,nome,caminho,created_at").eq("processo_id", p.id).order("created_at"),
    ]);
    setDocs((d.data as unknown as Doc[]) ?? []);
    setAnexos((a.data as Anexo[]) ?? []);
  }

  async function proximoNumero() {
    const { data } = await supabase.from("processos").select("numero").order("numero", { ascending: false }).limit(1);
    setNumero(String(((data?.[0]?.numero as number | undefined) ?? 0) + 1));
  }

  async function criarProcesso() {
    if (!tema.trim() || !assunto.trim() || !descricao.trim() || !numero.trim()) return;
    setSalvando(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const uid = user.user?.id ?? "";
      const { data: criado, error } = await supabase.from("processos")
        .insert({ tema: tema.trim(), assunto: assunto.trim(), descricao: descricao.trim(), acessos: Array.from(new Set([uid, ...acessos])) })
        .select("id").single();
      if (error || !criado) throw new Error("Falha ao criar");
      const { error: abertura } = await supabase.rpc("abrir_processo_simples", { _id: criado.id, _numero: Number(numero) });
      if (abertura) throw abertura;
      toast.success("Processo aberto para tramitação");
      setNovo(false); setTema(""); setAssunto(""); setDescricao(""); setAcessos([]); setNumero("");
      load();
    } catch {
      toast.error("Não foi possível abrir o processo. Confira se a numeração já foi utilizada.");
    } finally { setSalvando(false); }
  }

  async function enviarAnexo(file: File) {
    if (!aberto) return;
    setEnviando(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const uid = user.user?.id ?? "";
      const caminho = `${aberto.id}/${crypto.randomUUID()}.pdf`;
      const { error: up } = await supabase.storage.from("processos-pdfs").upload(caminho, file, { contentType: "application/pdf" });
      if (up) throw up;
      const { error: ins } = await supabase.from("processo_anexos").insert({ processo_id: aberto.id, caminho, nome: file.name, criado_por: uid });
      if (ins) throw ins;
      toast.success("PDF anexado ao processo");
      abrirDetalhes(aberto);
    } catch { toast.error("Não foi possível anexar o PDF."); } finally { setEnviando(false); }
  }

  async function baixarAnexo(a: Anexo) {
    const { data, error } = await supabase.storage.from("processos-pdfs").createSignedUrl(a.caminho, 300);
    if (error || !data) { toast.error("Não foi possível baixar o anexo."); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  if (!ready) return null;
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-2xl font-bold text-primary-foreground">Processos</h1>
          <Button onClick={() => { setNovo(true); proximoNumero(); }}><FilePlus2 className="h-4 w-4" /> Novo processo</Button>
        </div>
        {rows === null ? (
          <p className="text-primary-foreground">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-primary-foreground">Nenhum processo aberto ainda.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
                <div className="mr-auto min-w-0">
                  <p className="font-sans font-bold">Processo Nº {String(p.numero).padStart(3, "0")} — {p.tema}</p>
                  <p className="break-words text-sm text-muted-foreground">{p.assunto}</p>
                  <p className="text-xs text-muted-foreground">{p.aberto_em ? `Aberto em ${new Date(p.aberto_em).toLocaleDateString("pt-BR", { timeZone: "America/Boa_Vista" })}` : "Aguardando ofício de abertura"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => abrirDetalhes(p)}>Visualizar</Button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Dialog open={novo} onOpenChange={(o) => !o && setNovo(false)}>
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo processo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="tema">Tema</Label><Input id="tema" maxLength={200} value={tema} onChange={(e) => setTema(e.target.value)} /></div>
            <div><Label htmlFor="assunto-proc">Assunto</Label><Textarea id="assunto-proc" rows={2} maxLength={500} value={assunto} onChange={(e) => setAssunto(e.target.value)} /></div>
            <div><Label htmlFor="descricao">Descrição</Label><Textarea id="descricao" rows={4} maxLength={4000} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
            <div>
              <Label>Quem pode acessar</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {paineis.map((p) => {
                  const marcado = acessos.includes(p.user_id);
                  return <Button key={p.user_id} size="sm" variant={marcado ? "default" : "outline"} aria-pressed={marcado}
                    onClick={() => setAcessos(marcado ? acessos.filter((a) => a !== p.user_id) : [...acessos, p.user_id])}>{p.nome}</Button>;
                })}
              </div>
            </div>
            <div><Label htmlFor="numero-proc">Numeração do processo</Label><Input id="numero-proc" type="number" min={1} required value={numero} onChange={(e) => setNumero(e.target.value)} /></div>
            <Button className="w-full" disabled={salvando || !tema.trim() || !assunto.trim() || !descricao.trim() || !numero.trim()} onClick={criarProcesso}>
              {salvando ? "Abrindo…" : "Abrir processo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aberto} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader><DialogTitle>{aberto ? `Processo Nº ${String(aberto.numero).padStart(3, "0")} — ${aberto.tema}` : "Processo"}</DialogTitle></DialogHeader>
          {aberto && (
            <div className="space-y-4">
              <p className="whitespace-pre-line text-sm">{aberto.descricao}</p>
              {aberto.aberto_em && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/" search={{ processo: aberto.id }}><FilePlus2 className="h-4 w-4" /> Novo documento neste processo</Link>
                </Button>
              )}
              <h3 className="font-semibold">Documentos do processo</h3>
              {docs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento vinculado.</p>}
              {docs.map((d) => <p key={d.id} className="text-sm">{numeroFormatado(d.dados)} — {d.status}</p>)}
              <h3 className="font-semibold">Anexos externos</h3>
              {anexos.map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm">{a.nome}</p>
                  <Button size="sm" variant="outline" onClick={() => baixarAnexo(a)}><Download className="h-4 w-4" /></Button>
                </div>
              ))}
              <input ref={uploadRef} type="file" accept="application/pdf,.pdf" className="hidden" aria-label="Anexar PDF externo"
                onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (f) enviarAnexo(f); }} />
              <Button variant="outline" disabled={enviando || !aberto.aberto_em} onClick={() => uploadRef.current?.click()}>
                <Upload className="h-4 w-4" /> {enviando ? "Enviando…" : "Anexar PDF externo"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
