import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Download, Link2, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { carregarExtras, carregarSolicitacoes, enviarParaAssinatura, gestorasDoDespacho, type GestoraKey } from "@/lib/assinaturas-eletronicas";
import { GESTORAS, type Despacho } from "@/lib/documento";
import { lerAssinaturaPng } from "@/lib/assinatura";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isStatusDocumento, ordenarEmitidos, STATUS_DOCUMENTO, type StatusDocumento } from "@/lib/emitidos";
import { gerarPDF } from "@/lib/pdf";
import { numeroFormatado, type Documento } from "@/lib/documento";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Emitidos — Gerador de Ofícios CCM" },
      { name: "description", content: "Documentos já emitidos pela Coordenação de Comunicação e Mídia." },
      { property: "og:title", content: "Emitidos — Gerador de Ofícios CCM" },
      { property: "og:description", content: "Documentos já emitidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Historico,
});

type Row = { id: string; tipo: string; numero: number; ano: number; status: StatusDocumento; assunto: string; created_at: string; dados: Documento };

function Historico() {
  const { ready } = useRequireSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [updating, setUpdating] = useState<string[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = () =>
    supabase
      .from("documentos")
      .select("id, tipo, numero, ano, status, assunto, created_at, dados")
      .order("ano", { ascending: false })
      .order("numero", { ascending: false })
      .then(({ data, error }) => {
        setLoadError(Boolean(error));
        if (error) { toast.error("Não foi possível carregar os documentos."); return; }
        setRows(ordenarEmitidos((data as unknown as Row[]) ?? []));
      });

  const [envio, setEnvio] = useState<{ row: Row; opcao: Despacho } | null>(null);
  const [links, setLinks] = useState<{ row: Row; itens: { gestora: string; signatario_nome: string | null; token: string; assinado_em: string | null }[] } | null>(null);
  const [prioridade,setPrioridade] = useState("normal");
  const [prazo,setPrazo] = useState("");
  const [termo,setTermo] = useState("");
  const [extras,setExtras] = useState<{nome:string;funcao:string}[]>([]);
  const [funcoes,setFuncoes] = useState<string[]>([]);
  const [sending,setSending] = useState(false);
  const [banco, setBanco] = useState<Record<string, string>>({});

  const carregarBanco = () => supabase.from("assinaturas_gestoras").select("gestora, imagem")
    .then(({ data }) => setBanco(Object.fromEntries((data ?? []).map(d => [d.gestora, d.imagem]))));

  async function salvarImagem(gestora: GestoraKey, file?: File) {
    if (!file) return;
    try {
      const imagem = await lerAssinaturaPng(file);
      const { error } = await supabase.from("assinaturas_gestoras").upsert({ gestora, imagem, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success("Assinatura salva"); carregarBanco();
    } catch { toast.error("Envie uma imagem PNG válida."); }
  }

  async function abrirLinks(row: Row) {
    setLinks({ row, itens: await carregarSolicitacoes(row.id) });
  }

  async function confirmarEnvio() {
    if (!envio) return;
    setSending(true);
    try {
      await enviarParaAssinatura(envio.row.id, gestorasDoDespacho(envio.opcao), null,extras,prioridade,prazo || null,termo);
      setRows(current => current?.map(row => row.id === envio.row.id ? { ...row, status: "enviado" } : row) ?? null);
      const row = envio.row;
      setEnvio(null);
      toast.success("Enviado para assinatura");
      abrirLinks(row);
    } catch { toast.error("Não foi possível enviar. Confira os signatários; documentos já enviados não podem ser reenviados."); } finally { setSending(false); }
  }

  async function baixar(row: Row) {
    try { await gerarPDF(row.dados, true, await carregarExtras(row.id)); }
    catch { toast.error("Não foi possível gerar o PDF."); }
  }

  async function alterarStatus(id: string, status: string) {
    if (!isStatusDocumento(status)) return;
    if (status === "enviado") {
      const row = rows?.find(r => r.id === id);
      if (row) { setExtras([]); setPrazo(""); setPrioridade("normal"); setTermo(""); setEnvio({ row, opcao: row.dados.despacho ?? "ambas" }); return; }
    }
    setUpdating(current => [...current, id]);
    try {
      const { data, error } = await supabase.from("documentos")
        .update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("status").single();
      if (error || !data || !isStatusDocumento(data.status)) throw new Error("Falha ao salvar status");
      setRows(current => current?.map(row => row.id === id ? { ...row, status } : row) ?? null);
      toast.success("Status atualizado");
    } catch {
      toast.error("Não foi possível salvar o status. Tente novamente.");
    } finally {
      setUpdating(current => current.filter(value => value !== id));
    }
  }

  useEffect(() => {
    if (ready) { load(); carregarBanco(); supabase.from("funcoes_predefinidas").select("nome").order("nome").then(({data})=>setFuncoes((data??[]).map(f=>f.nome))); }
  }, [ready]);

  if (!ready) return null;
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-primary-foreground">Documentos emitidos</h1>
        {loadError ? (
          <Button variant="outline" onClick={load}>Tentar novamente</Button>
        ) : rows === null ? (
          <p className="text-primary-foreground">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-primary-foreground">Nenhum documento salvo ainda.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className={`flex flex-col gap-3 rounded-lg border border-status-ink/15 p-4 text-status-ink sm:flex-row sm:items-center ${STATUS_DOCUMENTO[r.status]?.className ?? STATUS_DOCUMENTO.desenvolvendo.className}`}>
                <div className="mr-auto min-w-0">
                  <p className="font-sans font-bold">{numeroFormatado(r.dados)}</p>
                  <p className="break-words text-sm opacity-80">{r.assunto}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Select value={r.status} disabled={updating.includes(r.id)} onValueChange={value => alterarStatus(r.id, value)}>
                    <SelectTrigger aria-label={`Status de ${numeroFormatado(r.dados)}`} className="w-40 border-status-ink/25 bg-paper/70 text-status-ink">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_DOCUMENTO) as StatusDocumento[]).map(status => (
                        <SelectItem key={status} value={status}>{STATUS_DOCUMENTO[status].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/" search={{ id: r.id }}>
                      <Pencil className="h-4 w-4" /> Editar
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => baixar(r)}>
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                  {r.status !== "desenvolvendo" && (
                    <Button size="sm" variant="outline" onClick={() => abrirLinks(r)}>
                      <Link2 className="h-4 w-4" /> Links
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="Excluir"
                    onClick={async () => {
                      if (!confirm("Excluir este documento?")) return;
                      const { error } = await supabase.from("documentos").delete().eq("id", r.id);
                      if (error) { toast.error("Não foi possível excluir o documento."); return; }
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
        <section className="mt-10 rounded-lg bg-card p-4 text-card-foreground">
          <h2 className="mb-3 font-bold">Banco de assinaturas das gestoras</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["pedagogica", "administrativa"] as GestoraKey[]).map(g => (
              <div key={g} className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-semibold">{GESTORAS[g].nome}</p>
                {banco[g] ? <img src={banco[g]} alt={`Assinatura de ${GESTORAS[g].nome}`} className="h-14 object-contain" /> : <p className="text-xs text-muted-foreground">Nenhuma imagem enviada.</p>}
                <label className="inline-block cursor-pointer text-sm text-primary underline">
                  {banco[g] ? "Trocar imagem" : "Enviar PNG"}
                  <input type="file" accept="image/png" className="hidden" onChange={e => salvarImagem(g, e.target.files?.[0])} />
                </label>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Dialog open={!!envio} onOpenChange={o => !o && setEnvio(null)}>
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader><DialogTitle>Enviar para assinatura</DialogTitle></DialogHeader>
          <p className="text-sm">Quem deve assinar o despacho?</p>
          <div className="flex flex-wrap gap-2">
            {([["pedagogica", "Gestora Ped."], ["administrativa", "Gestora Adm."], ["ambas", "As duas"]] as [Despacho, string][]).map(([v, l]) => (
              <Button key={v} variant={envio?.opcao === v ? "default" : "outline"} onClick={() => envio && setEnvio({ ...envio, opcao: v })}>{l}</Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Sua emissão eletrônica será registrada agora. Será gerado um link único para cada gestora.</p>
          <div className="grid grid-cols-2 gap-3"><div><Label>Prioridade</Label><Select value={prioridade} onValueChange={setPrioridade}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="alta">Alta</SelectItem></SelectContent></Select></div><div><Label htmlFor="prazo">Data limite</Label><Input id="prazo" type="date" value={prazo} onChange={e=>setPrazo(e.target.value)}/></div></div>
          <div><Label htmlFor="termo">Termo de ciência</Label><Textarea id="termo" maxLength={2000} value={termo} onChange={e=>setTermo(e.target.value)}/></div>
          <h3 className="font-semibold">Outros signatários</h3>
          {extras.map((extra,i)=><div key={i} className="space-y-2 border-b pb-3"><Input aria-label={`Nome do signatário ${i+1}`} maxLength={200} value={extra.nome} onChange={e=>setExtras(extras.map((x,j)=>j===i?{...x,nome:e.target.value}:x))}/><Select value={extra.funcao} onValueChange={v=>setExtras(extras.map((x,j)=>j===i?{...x,funcao:v}:x))}><SelectTrigger aria-label={`Função do signatário ${i+1}`}><SelectValue placeholder="Função"/></SelectTrigger><SelectContent>{funcoes.map(f=><SelectItem value={f} key={f}>{f}</SelectItem>)}</SelectContent></Select><Button variant="outline" size="sm" onClick={()=>setExtras(extras.filter((_,j)=>j!==i))}>Remover</Button></div>)}
          <Button variant="outline" disabled={!funcoes.length || extras.length>=10} onClick={()=>setExtras([...extras,{nome:"",funcao:funcoes[0]??""}])}>Adicionar signatário</Button>
          <Button disabled={sending || extras.some(e=>!e.nome.trim() || !e.funcao)} onClick={confirmarEnvio}>{sending?"Enviando...":"Assinar emissão e enviar"}</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={!!links} onOpenChange={o => !o && setLinks(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Links de assinatura</DialogTitle></DialogHeader>
          {links?.itens.length === 0 && <p className="text-sm">Nenhum link gerado.</p>}
          {links?.itens.map(i => {
            const url = `${window.location.origin}/assinar/${i.token}`;
            return (
              <div key={i.token} className="space-y-1 rounded-md border p-3">
                <p className="text-sm font-semibold">{(i.signatario_nome ?? GESTORAS[i.gestora as GestoraKey]?.nome)} — {i.assinado_em ? "Assinado" : "Aguardando"}</p>
                <div className="flex gap-2">
                  <input readOnly value={url} className="min-w-0 flex-1 rounded border bg-paper px-2 text-xs text-paper-ink" />
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          })}
        </DialogContent>
      </Dialog>
    </div>
  );
}
