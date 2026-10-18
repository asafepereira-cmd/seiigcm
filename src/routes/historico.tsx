import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Download, Link2, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { carregarExtras, carregarSolicitacoes, enviarParaAssinatura, gestorasDoDespacho, type GestoraKey } from "@/lib/assinaturas-eletronicas";
import { GESTORAS, type Despacho } from "@/lib/documento";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isStatusDocumento, ordenarEmitidos, STATUS_DOCUMENTO, type StatusDocumento } from "@/lib/emitidos";
import { gerarPDF } from "@/lib/pdf";
import { numeroFormatado, type Documento } from "@/lib/documento";
import { podeEditarDocumento, podeComentarDocumento } from "@/lib/document-access";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Emitidos — SEII GCM" },
      { name: "description", content: "Documentos já emitidos pela Coordenação de Comunicação e Mídia." },
      { property: "og:title", content: "Emitidos — SEII GCM" },
      { property: "og:description", content: "Documentos já emitidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Historico,
});

type Row = { id: string; tipo: string; numero: number; ano: number; status: StatusDocumento; assunto: string; created_at: string; dados: Documento; criado_por:string|null; analise_admin:boolean; enviado_analise_em:string|null; emitido_em:string|null };

function Historico() {
  const { ready, session, isAdmin } = useRequireSession();
  const [detalhes,setDetalhes] = useState<Row|null>(null);
  const [comentario,setComentario] = useState('');
  const [comentarios,setComentarios] = useState<{id:string;texto:string;created_at:string}[]>([]);
  const [registros,setRegistros] = useState<{gestora:string;signatario_nome:string|null;assinado_em:string|null;decisao:string|null}[]>([]);
  async function verDetalhes(row:Row) {
    setDetalhes(row); setComentario(''); setComentarios([]); setRegistros([]);
    const [c,s] = await Promise.all([supabase.from('documento_comentarios').select('id,texto,created_at').eq('documento_id',row.id).order('created_at'),supabase.from('solicitacoes_assinatura').select('gestora,signatario_nome,assinado_em,decisao').eq('documento_id',row.id)]);
    if(c.error || s.error) toast.error('Não foi possível carregar todos os registros.');
    setComentarios(c.data??[]); setRegistros(s.data??[]);
  }
  const [rows, setRows] = useState<Row[] | null>(null);
  const [updating, setUpdating] = useState<string[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = () =>
    supabase
      .from("documentos")
       .select("id, tipo, numero, ano, status, assunto, created_at, dados, criado_por, analise_admin, enviado_analise_em, emitido_em")
      .order("ano", { ascending: false })
      .order("numero", { ascending: false })
      .then(({ data, error }) => {
        setLoadError(Boolean(error));
        if (error) { toast.error("Não foi possível carregar os documentos."); return; }
        setRows(ordenarEmitidos((data as unknown as Row[]) ?? []));
      });

  const [envio, setEnvio] = useState<{ row: Row; opcao: Despacho } | null>(null);
  const [links, setLinks] = useState<{ row: Row; itens: { id: string; gestora: string; signatario_nome: string | null; token: string; assinado_em: string | null }[] } | null>(null);
  const [prioridade,setPrioridade] = useState("normal");
  const [prazo,setPrazo] = useState("");
  const [termo,setTermo] = useState("");
  const [extras,setExtras] = useState<{nome:string;funcao:string;user_id?:string}[]>([]);
  const [paineis,setPaineis] = useState<{user_id:string;nome:string;funcao:string}[]>([]);
  const [funcoes,setFuncoes] = useState<string[]>([]);
  const [sending,setSending] = useState(false);
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
    const documento=rows?.find(r=>r.id===id);
    if (!documento || !podeEditarDocumento(isAdmin,session?.user.id??'',documento)) return;
    if (!isAdmin && status === 'enviado') {
      const {error}=await supabase.rpc('submeter_analise',{_id:id});
      if(error) toast.error('Não foi possível enviar para análise.');
      else {toast.success('Enviado para análise do administrador');load();}
      return;
    }
    if (!isAdmin) return;
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
    if (ready) { load(); supabase.from("paineis").select("user_id,nome,funcao").order("nome").then(({data})=>setPaineis(data??[])); supabase.from("funcoes_predefinidas").select("nome").order("nome").then(({data})=>setFuncoes((data??[]).map(f=>f.nome))); }
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
                  {r.analise_admin && <p className="text-sm font-semibold">Em análise pelo administrador</p>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {isAdmin ? <Select value={r.status} disabled={updating.includes(r.id)} onValueChange={value => alterarStatus(r.id, value)}>
                    <SelectTrigger aria-label={`Status de ${numeroFormatado(r.dados)}`} className="w-40 border-status-ink/25 bg-paper/70 text-status-ink">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_DOCUMENTO) as StatusDocumento[]).map(status => (
                        <SelectItem key={status} value={status}>{STATUS_DOCUMENTO[status].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select> : <span className="text-sm font-semibold">{STATUS_DOCUMENTO[r.status].label}</span>}
                  {!isAdmin && podeEditarDocumento(false,session?.user.id??'',r) && <Button size="sm" onClick={()=>alterarStatus(r.id,'enviado')}>Enviar para análise</Button>}
                  <Button size="sm" variant="outline" onClick={()=>verDetalhes(r)}>Visualizar</Button>
                  {podeEditarDocumento(isAdmin,session?.user.id??'',r) && <Button size="sm" variant="outline" asChild>
                    <Link to="/" search={{ id: r.id }}>
                      <Pencil className="h-4 w-4" /> Editar
                    </Link>
                  </Button>}
                  <Button size="sm" variant="outline" onClick={() => baixar(r)}>
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                  {isAdmin && r.status !== "desenvolvendo" && (
                    <Button size="sm" variant="outline" onClick={() => abrirLinks(r)}>
                      <Link2 className="h-4 w-4" /> Links
                    </Button>
                  )}
                  {podeEditarDocumento(isAdmin,session?.user.id??'',r) && <Button
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
                  </Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Dialog open={!!detalhes} onOpenChange={o=>!o&&setDetalhes(null)}><DialogContent className="max-h-[85svh] overflow-y-auto"><DialogHeader><DialogTitle>{detalhes?numeroFormatado(detalhes.dados):'Documento'}</DialogTitle></DialogHeader>
        {detalhes && <><p className="font-semibold">{detalhes.assunto}</p><p className="whitespace-pre-line">{detalhes.dados.corpo}</p><p className="text-sm">Emissor: {detalhes.dados.assinante} — {detalhes.dados.cargo}</p><p className="text-sm">Emissão: {detalhes.emitido_em?new Date(detalhes.emitido_em).toLocaleString('pt-BR',{timeZone:'America/Boa_Vista'}):'Ainda não encaminhado para assinaturas'}</p>
        {registros.map((s,i)=><p key={i} className="text-sm">{s.signatario_nome??GESTORAS[s.gestora as GestoraKey]?.nome??s.gestora}: {s.assinado_em?`${s.decisao} · ${new Date(s.assinado_em).toLocaleString('pt-BR',{timeZone:'America/Boa_Vista'})}`:'Aguardando assinatura'}</p>)}
        <h3 className="font-semibold">Comentários</h3>{comentarios.map(c=><p key={c.id} className="whitespace-pre-line border-b pb-2 text-sm">{c.texto}<span className="block text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString('pt-BR',{timeZone:'America/Boa_Vista'})}</span></p>)}
        {podeComentarDocumento(detalhes.status)&&<form className="space-y-2" onSubmit={async e=>{e.preventDefault();const {error}=await supabase.from('documento_comentarios').insert({documento_id:detalhes.id,texto:comentario.trim()});if(error)toast.error('Não foi possível comentar.');else {toast.success('Comentário registrado');verDetalhes(detalhes);}}}><Textarea aria-label="Comentário" maxLength={2000} required value={comentario} onChange={e=>setComentario(e.target.value)}/><Button type="submit" disabled={!comentario.trim()}>Comentar</Button></form>}</>}
      </DialogContent></Dialog>
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
          {extras.map((extra,i)=><div key={i} className="space-y-2 border-b pb-3"><Input aria-label={`Nome completo do signatário ${i+1}`} placeholder="Nome completo" disabled={!!extra.user_id} maxLength={200} value={extra.nome} onChange={e=>setExtras(extras.map((x,j)=>j===i?{...x,nome:e.target.value}:x))}/><Input list="funcoes-lista" aria-label={`Função do signatário ${i+1}`} placeholder="Função" maxLength={200} disabled={!!extra.user_id} value={extra.funcao} onChange={e=>setExtras(extras.map((x,j)=>j===i?{...x,funcao:e.target.value}:x))}/><Button variant="outline" size="sm" onClick={()=>setExtras(extras.filter((_,j)=>j!==i))}>Remover</Button></div>)}
          <datalist id="funcoes-lista">{funcoes.map(f=><option value={f} key={f}/>)}</datalist>
          <Button variant="outline" disabled={extras.length>=10} onClick={()=>setExtras([...extras,{nome:"",funcao:""}])}>Adicionar signatário</Button>
          {paineis.length>0 && <div className="flex flex-wrap gap-2">{paineis.filter(p=>!extras.some(e=>e.user_id===p.user_id)).map(p=><Button key={p.user_id} size="sm" variant="outline" disabled={extras.length>=10} onClick={()=>setExtras([...extras,{nome:p.nome,funcao:p.funcao,user_id:p.user_id}])}>+ Painel: {p.nome}</Button>)}</div>}
          <Button disabled={sending || extras.some(e=>!e.nome.trim() || !e.funcao.trim())} onClick={confirmarEnvio}>{sending?"Enviando...":"Assinar emissão e enviar"}</Button>
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
                  {isAdmin && !i.assinado_em && <Button size="sm" variant="destructive" onClick={async () => { if (!links || !confirm("Excluir esta solicitação de assinatura?")) return; const { error } = await supabase.rpc("excluir_solicitacao", { _id: i.id }); if (error) toast.error("Não foi possível excluir."); else { toast.success("Solicitação excluída"); abrirLinks(links.row); } }}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
            );
          })}
          {isAdmin && links && <Button variant="outline" onClick={() => { const row = links.row; setLinks(null); setEnvio({ row, opcao: "ambas" }); }}>Adicionar signatário</Button>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
