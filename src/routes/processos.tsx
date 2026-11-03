import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, FilePlus2, Upload, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DocumentViewer } from "@/components/DocumentViewer";
import { processoFormatado, numeroFormatado, type Documento } from "@/lib/documento";

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

type Processo = { id: string; numero: number; tema: string; assunto: string; descricao: string; acessos: string[]; criado_por: string; oficio_id: string | null; aberto_em: string | null; encerrado_em?: string | null; created_at: string };
type Doc = { id: string; dados: Documento; status: string };
type Anexo = { criado_por: string; id: string; nome: string; caminho: string; created_at: string };

function Processos() {
  const { ready, session, isAdmin } = useRequireSession(false);
  const [podeEmitir, setPodeEmitir] = useState(false);
  const [visualizandoDoc, setVisualizandoDoc] = useState<string | null>(null);
  const [rows, setRows] = useState<Processo[] | null>(null);
  const [paineis, setPaineis] = useState<{ user_id: string; nome: string; setor: string; tipo_painel: string }[]>([]);
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
  const [edicao, setEdicao] = useState<{ tema: string; assunto: string; descricao: string; acessos: string[] } | null>(null);
  const podeGerir = (p: Processo) => podeEmitir && (isAdmin || p.criado_por === session?.user.id);

  async function salvarEdicao() {
    if (!aberto || !edicao) return;
    const dados = { tema: edicao.tema.trim(), assunto: edicao.assunto.trim(), descricao: edicao.descricao.trim(), acessos: Array.from(new Set([aberto.criado_por, ...edicao.acessos])) };
    const { error } = await supabase.from("processos").update(dados).eq("id", aberto.id);
    if (error) { toast.error("Não foi possível salvar o processo."); return; }
    toast.success("Processo atualizado");
    setAberto({ ...aberto, ...dados }); setEdicao(null); load();
  }

  async function excluirProcesso() {
    if (!aberto || !confirm(`Excluir ${tituloProcesso(aberto)}? Os documentos continuam em Docs, sem vínculo com o processo.`)) return;
    const { error } = await supabase.from("processos").delete().eq("id", aberto.id);
    if (error) { toast.error("Não foi possível excluir o processo."); return; }
    toast.success("Processo excluído"); setAberto(null); load();
  }

  const load = () =>
    supabase.from("processos").select("id,numero,tema,assunto,descricao,acessos,criado_por,oficio_id,aberto_em,encerrado_em,created_at").order("numero", { ascending: false })
      .then(({ data, error }) => {
        if (error) { toast.error("Não foi possível carregar os processos."); return; }
        setRows((data as Processo[]) ?? []);
      });

  useEffect(() => {
    if (!ready) return;
    load();
    supabase.from('paineis').select('pode_emitir').eq('user_id', session?.user.id ?? '').maybeSingle().then(({ data }) => setPodeEmitir(isAdmin || !!data?.pode_emitir));
    supabase.from("paineis").select("user_id,nome,setor,tipo_painel").eq("ativo", true).order("nome").then(({ data }) => setPaineis(data ?? []));
  }, [ready, isAdmin, session?.user.id]);

  async function abrirDetalhes(p: Processo) {
    setAberto(p); setDocs([]); setAnexos([]);
    const [d, a] = await Promise.all([
      supabase.from("documentos").select("id,dados,status").eq("processo_id", p.id),
      supabase.from("processo_anexos").select("id,nome,caminho,created_at,criado_por").eq("processo_id", p.id).order("created_at"),
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
        .insert({ numero: Number(numero), tema: tema.trim(), assunto: assunto.trim(), descricao: descricao.trim(), acessos: Array.from(new Set([uid, ...acessos])) })
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

  async function excluirAnexo(a: Anexo) {
    if (!aberto || !window.confirm(`Excluir ${a.nome} deste processo?`)) return;
    const { error } = await supabase.rpc('excluir_anexo_processo', { _id: a.id });
    if (error) { toast.error('Não foi possível excluir o anexo.'); return; }
    toast.success('Anexo excluído');
    setAnexos(current => current.filter(item => item.id !== a.id));
  }

  const autoriaProcesso = (p: Processo) => {
    const autor=paineis.find(x=>x.user_id===p.criado_por);
    return autor ? (autor.tipo_painel==='setor'?autor.setor||autor.nome:autor.nome) : 'Conta responsável';
  };
  const aberturaProcesso = (p: Processo) => p.aberto_em ? `Aberto por ${autoriaProcesso(p)} em ${new Date(p.aberto_em).toLocaleString('pt-BR',{timeZone:'America/Boa_Vista'})}` : 'Aguardando abertura';
  const tituloProcesso = (p: Processo) => processoFormatado({ numero: p.numero, ano: new Date(p.created_at).getFullYear() });
  if (!ready) return null;
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-2xl font-bold text-primary-foreground">Processos</h1>
          {podeEmitir && <Button onClick={() => { setNovo(true); proximoNumero(); }}><FilePlus2 className="h-4 w-4" /> Novo processo</Button>}
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
                  <p className="font-sans font-bold">{tituloProcesso(p)} — {p.tema}</p>{p.encerrado_em && <span className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Encerrado e arquivado</span>}
                  <p className="break-words text-sm text-muted-foreground">{p.assunto}</p>
                  <p className="text-xs text-muted-foreground">{aberturaProcesso(p)}</p>
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
        <DialogContent className="h-svh max-h-svh w-screen max-w-none rounded-none overflow-y-auto sm:rounded-none content-start">
          <DialogHeader><DialogTitle className="pr-8">{aberto ? tituloProcesso(aberto) : "Processo"}</DialogTitle></DialogHeader>
          {aberto && (
            <div className="mx-auto w-full max-w-6xl space-y-4">
              {podeGerir(aberto) && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEdicao({ tema: aberto.tema, assunto: aberto.assunto, descricao: aberto.descricao, acessos: aberto.acessos })}><Pencil className="h-4 w-4" /> Editar processo</Button>
                  {!aberto.encerrado_em && <Button size="sm" variant="secondary" onClick={async () => {
                    if (!confirm(`Encerrar e arquivar ${tituloProcesso(aberto)}? Não será possível anexar novos itens.`)) return;
                    const { error } = await supabase.rpc("encerrar_arquivar_processo", { _id: aberto.id });
                    if (error) { toast.error("Não foi possível encerrar o processo."); return; }
                    toast.success("Processo encerrado e arquivado"); setAberto(null); load();
                  }}>Encerrar e arquivar processo</Button>}
                  <Button size="sm" variant="destructive" onClick={excluirProcesso}><Trash2 className="h-4 w-4" /> Excluir processo</Button>
                </div>
              )}
              <h2 className="text-center text-xl font-bold">{aberto.tema}</h2><p className="text-sm text-muted-foreground">{aberturaProcesso(aberto)}</p>
              <p className="font-semibold">{aberto.assunto}</p>
              <p className="whitespace-pre-line text-sm">{aberto.descricao}</p>
              {aberto.encerrado_em && <p className="rounded-md bg-muted px-3 py-2 text-sm font-semibold">Processo encerrado e arquivado em {new Date(aberto.encerrado_em).toLocaleDateString("pt-BR")} — não aceita novos documentos ou anexos.</p>}
              {aberto.aberto_em && !aberto.encerrado_em && podeEmitir && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/" search={{ processo: aberto.id }}><FilePlus2 className="h-4 w-4" /> Novo documento neste processo</Link>
                </Button>
              )}
              <h3 className="font-semibold">Documentos do processo</h3>
              {docs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento vinculado.</p>}
              {docs.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
                  <div className="mr-auto min-w-0">
                    <p className="font-sans font-bold">{numeroFormatado(d.dados)}</p>
                    <p className="truncate text-sm text-muted-foreground">{d.dados.assunto}</p>
                    <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold ${d.status === "assinado" ? "document-status-signed" : d.status === "enviado" ? "document-status-sent" : "document-status-developing"}`}>{d.status === "assinado" ? "Assinado" : d.status === "enviado" ? "Enviado" : "Desenvolvendo"}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setVisualizandoDoc(d.id)}>Visualizar</Button>
                  {podeEmitir && <Button size="sm" variant="outline" asChild><Link to="/" search={{ id: d.id }}>Editar</Link></Button>}
                  {podeGerir(aberto) && <Button size="icon" variant="outline" aria-label="Excluir documento" onClick={async () => {
                    if (!confirm("Excluir este documento do processo?")) return;
                    const { error } = await supabase.rpc("excluir_documento", { _id: d.id });
                    if (error) toast.error("Não foi possível excluir."); else { toast.success("Documento excluído"); setDocs(c => c.filter(x => x.id !== d.id)); }
                  }}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              ))}
              <h3 className="font-semibold">Anexos externos</h3>
              {anexos.map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm">{a.nome}</p>
                  <Button aria-label={`Baixar ${a.nome}`} title="Baixar anexo" size="sm" variant="outline" onClick={() => baixarAnexo(a)}><Download className="h-4 w-4" /></Button>
                  {podeEmitir && (isAdmin || a.criado_por === session?.user.id) && <Button variant="outline" size="icon" title="Excluir anexo" aria-label={`Excluir ${a.nome}`} onClick={() => excluirAnexo(a)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              ))}
              <input ref={uploadRef} type="file" accept="application/pdf,.pdf" className="hidden" aria-label="Anexar PDF externo"
                onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (f) enviarAnexo(f); }} />
              {podeEmitir && <Button variant="outline" disabled={enviando || !aberto.aberto_em || !!aberto.encerrado_em} onClick={() => uploadRef.current?.click()}>
                <Upload className="h-4 w-4" /> {enviando ? "Enviando…" : "Anexar PDF externo"}
              </Button>}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!edicao} onOpenChange={(o) => !o && setEdicao(null)}>
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar processo</DialogTitle></DialogHeader>
          {edicao && <div className="space-y-3">
            <div><Label htmlFor="ed-tema">Nome / tema</Label><Input id="ed-tema" maxLength={200} value={edicao.tema} onChange={(e) => setEdicao({ ...edicao, tema: e.target.value })} /></div>
            <div><Label htmlFor="ed-assunto">Assunto</Label><Textarea id="ed-assunto" rows={2} maxLength={500} value={edicao.assunto} onChange={(e) => setEdicao({ ...edicao, assunto: e.target.value })} /></div>
            <div><Label htmlFor="ed-desc">Descrição</Label><Textarea id="ed-desc" rows={4} maxLength={4000} value={edicao.descricao} onChange={(e) => setEdicao({ ...edicao, descricao: e.target.value })} /></div>
            <div><Label>Quem pode acessar</Label><div className="mt-1.5 flex flex-wrap gap-2">{paineis.map((p) => { const m = edicao.acessos.includes(p.user_id); return <Button key={p.user_id} size="sm" variant={m ? "default" : "outline"} aria-pressed={m} onClick={() => setEdicao({ ...edicao, acessos: m ? edicao.acessos.filter((a) => a !== p.user_id) : [...edicao.acessos, p.user_id] })}>{p.nome}</Button>; })}</div></div>
            <Button className="w-full" disabled={!edicao.tema.trim() || !edicao.assunto.trim() || !edicao.descricao.trim()} onClick={salvarEdicao}>Salvar alterações</Button>
          </div>}
        </DialogContent>
      </Dialog>
      <DocumentViewer id={visualizandoDoc} onClose={() => setVisualizandoDoc(null)} />
    </div>
  );
}
