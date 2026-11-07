import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Download, Link2, Pencil, Trash2, FolderInput } from "lucide-react";
import { Input } from "@/components/ui/input";
import { numeroFormatado } from "@/lib/documento";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { carregarExtras, carregarSolicitacoes, enviarParaAssinatura, type GestoraKey } from "@/lib/assinaturas-eletronicas";
import { GESTORAS, type Despacho } from "@/lib/documento";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isStatusDocumento, ordenarEmitidos, STATUS_DOCUMENTO, type StatusDocumento } from "@/lib/emitidos";
import { identificacaoDocumento, processoFormatado, type Documento } from "@/lib/documento";
import { DocumentViewer } from "@/components/DocumentViewer";
import { podeEditarDocumento, acoesDocumentoRecebido } from "@/lib/document-access";

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

type Row = { id: string; tipo: string; numero: number; ano: number; status: StatusDocumento; assunto: string; created_at: string; dados: Documento; criado_por:string|null; analise_admin:boolean; enviado_analise_em:string|null; emitido_em:string|null; versao:number };

function Historico() {
  const { ready, session, isAdmin } = useRequireSession(false);
  const [view,setView]=useState<string|null>(null);
  const [received,setReceived]=useState<Record<string,{finalidade:string;token?:string;assinado_em:string|null}[]>>({});
  const [senders,setSenders]=useState<Record<string,string>>({});
  const [panelType,setPanelType]=useState('individual');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [aba,setAba]=useState<'todos'|'enviados'|'recebidos'>('todos');
  const [busca,setBusca]=useState('');const [campoBusca,setCampoBusca]=useState<'tema'|'texto'|'numero'>('tema');
  const casaBusca=(r:Row)=>{const q=busca.trim().toLocaleLowerCase('pt-BR');if(!q)return true;const d=r.dados;const alvo=campoBusca==='numero'?`${numeroFormatado(d)} ${d.numero} ${String(d.numero).padStart(3,'0')}/${d.ano}`:campoBusca==='texto'?`${d.corpo} ${d.vocativo??''} ${d.fecho??''}`:`${d.assunto} ${d.processo?.tema??''}`;return alvo.toLocaleLowerCase('pt-BR').includes(q);};
  const [updating, setUpdating] = useState<string[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [moveDoc,setMoveDoc] = useState<Row|null>(null);
  const [processes,setProcesses] = useState<{id:string;numero:number;tema:string;created_at:string}[]>([]);
  const [processId,setProcessId] = useState('');
  const [moving,setMoving] = useState(false);
  const isReceived = (r:Row) => r.criado_por!==session?.user.id && !!received[r.id];

  const load = async () => {
    const [panels, roles, requests, recipients] = await Promise.all([
      supabase.from("paineis").select("user_id,nome,setor,tipo_painel"),
      supabase.from("user_roles").select("role").eq("user_id",session?.user.id??""),
      supabase.from("solicitacoes_assinatura").select("documento_id,versao,gestora,finalidade,token,assinado_em"),
      supabase.from("documento_destinatarios").select("documento_id").eq("user_id",session?.user.id??""),
    ]);
    setSenders(Object.fromEntries((panels.data??[]).map(p=>[p.user_id,p.tipo_painel==="setor"?p.setor||p.nome:p.nome])));
    const destinos=new Set(["user:"+session?.user.id,...(roles.data??[]).map(r=>r.role)]);
    return supabase
      .from("documentos")
       .select("id, tipo, numero, ano, status, assunto, created_at, dados, criado_por, analise_admin, enviado_analise_em, emitido_em, versao")
      .order("ano", { ascending: false })
      .order("numero", { ascending: false })
      .then(({ data, error }) => {
        setLoadError(Boolean(error));
        if (error) { toast.error("Não foi possível carregar os documentos."); return; }
        const documents=(data as unknown as Row[])??[];
        const receivedMap: typeof received = {};
        for(const r of requests.data??[]) {
          if(!destinos.has(r.gestora)||!documents.some(d=>d.id===r.documento_id&&d.versao===r.versao&&d.criado_por!==session?.user.id))continue;
          (receivedMap[r.documento_id]??=[]).push({finalidade:r.finalidade,token:r.token,assinado_em:r.assinado_em});
        }
        for(const r of recipients.data??[]) if(!receivedMap[r.documento_id]&&documents.some(d=>d.id===r.documento_id&&d.criado_por!==session?.user.id)) receivedMap[r.documento_id]=[{finalidade:'ciencia',assinado_em:null}];
        setReceived(receivedMap);
        setRows(ordenarEmitidos(documents));
      });
  };

  const [envio, setEnvio] = useState<{ row: Row; opcao: Despacho } | null>(null);
  const [links, setLinks] = useState<{ row: Row; itens: { id: string; gestora: string; signatario_nome: string | null; token: string; assinado_em: string | null }[] } | null>(null);
  const [prioridade,setPrioridade] = useState("normal");
  const [prazo,setPrazo] = useState("");
  const [termo,setTermo] = useState("");
  const [extras,setExtras] = useState<{nome:string;funcao:string;user_id?:string}[]>([]);
  const [paineis,setPaineis] = useState<{user_id:string;nome:string;funcao:string}[]>([]);
  const [funcoes,setFuncoes] = useState<string[]>([]);
  const [sending,setSending] = useState(false);
  const [jaAssinantes,setJaAssinantes] = useState<string[]>([]);
  async function abrirLinks(row: Row) {
    setLinks({ row, itens: await carregarSolicitacoes(row.id) });
  }

  async function confirmarEnvio() {
    if (!envio) return;
    setSending(true);
    try {
      await enviarParaAssinatura(envio.row.id, [], null,extras,prioridade,prazo || null,termo);
      setRows(current => current?.map(row => row.id === envio.row.id ? { ...row, status: "enviado" } : row) ?? null);
      const row = envio.row;
      setEnvio(null);
      toast.success("Enviado para assinatura");
      abrirLinks(row);
    } catch { toast.error("Não foi possível enviar. Confira os signatários; documentos já enviados não podem ser reenviados."); } finally { setSending(false); }
  }

  async function baixar(row: Row) {
    try { const [{ gerarPDF }, extrasPDF] = await Promise.all([import("@/lib/pdf"), carregarExtras(row.id)]); await gerarPDF(row.dados, true, extrasPDF); }
    catch { toast.error("Não foi possível gerar o PDF."); }
  }

  async function alterarStatus(id: string, status: string) {
    if (!isStatusDocumento(status)) return;
    const documento=rows?.find(r=>r.id===id);
    if (!documento || !podeEditarDocumento(isAdmin,session?.user.id??'',documento)) return;
    if (status === "enviado") {
      const row = rows?.find(r => r.id === id);
      if (row) { setJaAssinantes([]); carregarSolicitacoes(row.id).then(s=>setJaAssinantes(s.map(x=>x.signatario_nome||x.gestora))).catch(()=>{}); setExtras([]); setPrazo(""); setPrioridade("normal"); setTermo(""); setEnvio({ row, opcao: row.dados.despacho ?? "ambas" }); return; }
    }
    if (!isAdmin) return;
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
    if (ready) {load();supabase.from('paineis').select('tipo_painel').eq('user_id',session?.user.id??'').maybeSingle().then(({data})=>setPanelType(data?.tipo_painel??'individual'));}
  }, [ready]);

  useEffect(() => {
    if (!envio) return;
    supabase.from("paineis").select("user_id,nome,funcao").order("nome").then(({data})=>setPaineis(data??[]));
    supabase.from("funcoes_predefinidas").select("nome").order("nome").then(({data})=>setFuncoes((data??[]).map(f=>f.nome)));
  }, [!!envio]);

  if (!ready) return null;
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold text-primary-foreground">Documentos</h1>
        <div className="mb-3 flex flex-wrap gap-2"><select aria-label="Buscar por" className="h-9 rounded-md border bg-card px-2 text-sm text-card-foreground" value={campoBusca} onChange={e=>setCampoBusca(e.target.value as typeof campoBusca)}><option value="tema">Tema / assunto</option><option value="texto">Texto</option><option value="numero">Número</option></select><Input aria-label="Buscar documentos" placeholder="Buscar documentos" className="min-w-40 flex-1 bg-card text-card-foreground" value={busca} onChange={e=>setBusca(e.target.value)}/></div><div className="mb-4 flex gap-2">{(['todos','enviados','recebidos'] as const).map(a=><Button key={a} size="sm" variant={aba===a?'secondary':'outline'} onClick={()=>setAba(a)}>{a==='todos'?'Todos':a==='enviados'?'Enviados':'Recebidos'}</Button>)}</div>
        {loadError ? (
          <Button variant="outline" onClick={load}>Tentar novamente</Button>
        ) : rows === null ? (
          <p className="text-primary-foreground">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-primary-foreground">Nenhum documento salvo ainda.</p>
        ) : (
          <ul className="space-y-3">
            {rows.filter(casaBusca).filter(r=>aba==='todos'||(aba==='enviados'?r.criado_por===session?.user.id:r.criado_por!==session?.user.id&&!!received[r.id])).map((r) => (
              <li key={r.id} className={`flex flex-col gap-3 rounded-lg border border-status-ink/15 p-4 text-status-ink sm:flex-row sm:items-center ${STATUS_DOCUMENTO[r.status]?.className ?? STATUS_DOCUMENTO.desenvolvendo.className}`}>
                <div className="mr-auto min-w-0">
                  <p className="font-sans font-bold break-words">{identificacaoDocumento(r.dados)}</p>
                  <p className="break-words text-sm opacity-80">{r.assunto}</p>
                  {isReceived(r)&&<p className="mt-1 text-sm">Enviado para {Array.from(new Set(received[r.id]?.map(x=>x.finalidade==='ciencia'?'ciência':'deferimento'))).join(' e ')} por: {senders[r.criado_por??'']||r.dados.setor||r.dados.assinante||r.dados.de}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{STATUS_DOCUMENTO[r.status].label}</span>
                  {!isReceived(r) && podeEditarDocumento(isAdmin,session?.user.id??'',r) && <Button size="sm" onClick={()=>alterarStatus(r.id,"enviado")}>Encaminhar assinaturas</Button>}
                  <Button size="sm" variant="outline" onClick={()=>setView(r.id)}>Visualizar</Button>
                  {isReceived(r)&&received[r.id]?.filter(x=>acoesDocumentoRecebido(x.finalidade,x.assinado_em).assinar&&x.token).map(x=><Button size="sm" asChild key={x.token}><Link to="/assinar/$token" params={{token:x.token??''}}>Assinar</Link></Button>)}
                  {!isReceived(r) && podeEditarDocumento(isAdmin,session?.user.id??'',r) && <Button size="sm" variant="outline" asChild>
                    <Link to="/" search={{ id: r.id }}>
                      <Pencil className="h-4 w-4" /> Editar
                    </Link>
                  </Button>}
                  <Button size="sm" variant="outline" onClick={() => baixar(r)}>
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                  {r.criado_por===session?.user.id&&<Button size="sm" variant="outline" onClick={async()=>{setMoveDoc(r);setProcessId('');const {data,error}=await supabase.from('processos').select('id,numero,tema,created_at').not('aberto_em','is',null).order('numero',{ascending:false});if(error)toast.error('Não foi possível carregar processos.');setProcesses(data??[]);}}><FolderInput className="h-4 w-4"/>Mover para processo</Button>}
                  {!isReceived(r) && podeEditarDocumento(isAdmin,session?.user.id??'',r) && <Button
                    size="sm"
                    variant="outline"
                    aria-label="Excluir"
                    onClick={async () => {
                      if (!confirm("Excluir este documento?")) return;
                      const { error } = await supabase.rpc("excluir_documento", { _id: r.id });
                      if (error) { toast.error(error.message || "Não foi possível excluir o documento."); return; }
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
      <DocumentViewer id={view} recebido={!!view&&!!rows?.some(r=>r.id===view&&isReceived(r))} onClose={()=>setView(null)}/>
      <Dialog open={!!moveDoc} onOpenChange={o=>!o&&setMoveDoc(null)}><DialogContent><DialogHeader><DialogTitle>Mover para processo</DialogTitle></DialogHeader><Select value={processId} onValueChange={setProcessId}><SelectTrigger aria-label="Processo de destino"><SelectValue placeholder="Selecionar processo"/></SelectTrigger><SelectContent>{processes.map(p=><SelectItem value={p.id} key={p.id}>{processoFormatado({numero:p.numero,ano:new Date(p.created_at).getFullYear()})} — {p.tema}</SelectItem>)}</SelectContent></Select>{!processes.length&&<p>Nenhum processo disponível.</p>}<Button disabled={!processId||moving} onClick={async()=>{if(!moveDoc)return;setMoving(true);const {error}=await supabase.rpc('mover_documento_processo',{_id:moveDoc.id,_processo:processId});setMoving(false);if(error)toast.error(error.message);else{toast.success('Documento movido para o processo');setMoveDoc(null);await load();}}}>{moving?'Movendo…':'Mover documento'}</Button></DialogContent></Dialog>
      <Dialog open={!!envio} onOpenChange={o => !o && setEnvio(null)}>
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader><DialogTitle>Enviar para assinatura</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Sua emissão eletrônica será registrada agora. Selecione um ou mais painéis ou pessoas para deferimento; cada um recebe um link único.</p>
          <div className="grid grid-cols-2 gap-3"><div><Label>Prioridade</Label><Select value={prioridade} onValueChange={setPrioridade}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="alta">Alta</SelectItem></SelectContent></Select></div><div><Label htmlFor="prazo">Data limite</Label><Input id="prazo" type="date" value={prazo} onChange={e=>setPrazo(e.target.value)}/></div></div>
          <div><Label htmlFor="termo">Termo de ciência</Label><Textarea id="termo" maxLength={2000} value={termo} onChange={e=>setTermo(e.target.value)}/></div>
          {jaAssinantes.length>0&&<div className="space-y-1"><h3 className="font-semibold">Já enviados</h3>{jaAssinantes.map((n,i)=><p key={i} className="text-sm">✓ {n}</p>)}</div>}
          <h3 className="font-semibold">Adicionar signatários</h3>
          {extras.map((extra,i)=><div key={i} className="space-y-2 border-b pb-3"><Input aria-label={`Nome completo do signatário ${i+1}`} placeholder="Nome completo" disabled={!!extra.user_id} maxLength={200} value={extra.nome} onChange={e=>setExtras(extras.map((x,j)=>j===i?{...x,nome:e.target.value}:x))}/><Input list="funcoes-lista" aria-label={`Função do signatário ${i+1}`} placeholder="Função" maxLength={200} disabled={!!extra.user_id} value={extra.funcao} onChange={e=>setExtras(extras.map((x,j)=>j===i?{...x,funcao:e.target.value}:x))}/><Button variant="outline" size="sm" onClick={()=>setExtras(extras.filter((_,j)=>j!==i))}>Remover</Button></div>)}
          <datalist id="funcoes-lista">{funcoes.map(f=><option value={f} key={f}/>)}</datalist>
          <Button variant="outline" disabled={extras.length>=10} onClick={()=>setExtras([...extras,{nome:"",funcao:""}])}>Adicionar signatário</Button>
          {paineis.length>0 && <div className="flex flex-wrap gap-2">{paineis.filter(p=>!extras.some(e=>e.user_id===p.user_id)).map(p=><Button key={p.user_id} size="sm" variant="outline" disabled={extras.length>=10} onClick={()=>setExtras([...extras,{nome:p.nome,funcao:p.funcao,user_id:p.user_id}])}>+ Painel: {p.nome}</Button>)}</div>}
          <Button variant="outline" onClick={()=>{const row=envio!.row;setEnvio(null);abrirLinks(row);}}><Link2 className="h-4 w-4"/> Emitir link(s) de assinatura(s)</Button>
          <Button disabled={sending || extras.length===0 || extras.some(e=>!e.nome.trim() || !e.funcao.trim())} onClick={confirmarEnvio}>{sending?"Enviando...":"Assinar emissão e enviar"}</Button>
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
                  {podeEditarDocumento(isAdmin,session?.user.id??'',links?.row ?? {criado_por:null,status:'desenvolvendo',analise_admin:false}) && !i.assinado_em && <Button size="sm" variant="destructive" onClick={async () => { if (!links || !confirm("Excluir esta solicitação de assinatura?")) return; const { error } = await supabase.rpc("excluir_solicitacao", { _id: i.id }); if (error) toast.error("Não foi possível excluir."); else { toast.success("Solicitação excluída"); abrirLinks(links.row); } }}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
            );
          })}
          {links && podeEditarDocumento(isAdmin,session?.user.id??'',links.row) && <Button variant="outline" onClick={() => { const row = links.row; setLinks(null); setEnvio({ row, opcao: "ambas" }); }}>Adicionar signatário</Button>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
