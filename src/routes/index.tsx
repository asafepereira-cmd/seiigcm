import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, Save, Sparkles, FilePlus2, Upload, X, Check, Circle, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { DocumentPreview } from "@/components/DocumentPreview";
import { RichTextEditor } from "@/components/RichTextEditor";
import { prepararFoto } from "@/lib/document-photo";
import { richParagraphs } from "@/lib/rich-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { destinatarios } from "@/lib/setor.functions";
import { podeExportar } from "@/lib/sector";
import { reviewWithAI } from "@/lib/server.functions";
import { conferirMinhaSenha } from "@/lib/profile.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { gerarPDF } from "@/lib/pdf";
import { carregarExtras } from "@/lib/assinaturas-eletronicas";
import { podeEditarDocumento } from "@/lib/document-access";
import { carregarEncaminhados } from "@/lib/encaminhados";
import { proximoNumeroDocumento } from "@/lib/document-numbering";
import { siglaSetor, dataExtenso, modeloGravacao, numeroFormatado, numeroValido, type Documento, type Participante } from "@/lib/documento";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { id?: string; processo?: string } => ({ ...(typeof s["id"] === "string" ? {id:s["id"]} : {}), ...(typeof s["processo"] === "string" ? {processo:s["processo"]} : {}) }),
  head: () => ({
    meta: [
      { title: "Novo documento — SEII GCM" },
      { name: "description", content: "Preencha os campos e gere o ofício em PDF no padrão do CEM XXXIII, com revisão por IA." },
      { property: "og:title", content: "Novo documento — SEII GCM" },
      { property: "og:description", content: "Gere ofícios em PDF no padrão do CEM XXXIII." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Editor,
});

const listaParaTexto = (l: Participante[]) => l.map((p) => (p.funcao ? `${p.nome} – ${p.funcao}` : p.nome)).join("\n");
const textoParaLista = (t: string): Participante[] =>
  t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.split(/\s+[–-]\s+/);
      return { nome: m[0] ?? "", funcao: m.slice(1).join(" – ") };
    });

function Editor() {
  const { ready, session, isAdmin } = useRequireSession();
  const { id, processo } = Route.useSearch();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Documento | null>(null);
  const [docId, setDocId] = useState<string | undefined>(id);
  const [listaTexto, setListaTexto] = useState("");
  const [instrucoes, setInstrucoes] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const listRecipients = useServerFn(destinatarios);
  const [panelType,setPanelType] = useState('individual');
  const [documentStatus,setDocumentStatus] = useState('desenvolvendo');
  const [pedirSenha,setPedirSenha] = useState(false);
  const [senhaEmissao,setSenhaEmissao] = useState('');
  const conferirSenha = useServerFn(conferirMinhaSenha);
  const [recipients,setRecipients] = useState<{id:string;nome:string}[]>([]);
  const [recipientSearch,setRecipientSearch] = useState('');
  const [recipientId,setRecipientId] = useState('');
  const [selectedRecipients,setSelectedRecipients] = useState<{id:string;nome:string}[]>([]);
  const [purpose,setPurpose] = useState<'deferimento'|'ciencia'>('deferimento');
  const [sending,setSending] = useState(false);
  useEffect(()=>{if(!ready)return;supabase.from('paineis').select('tipo_painel').eq('user_id',session?.user.id??'').maybeSingle().then(({data})=>setPanelType(data?.tipo_painel??'individual'));},[ready,session?.user.id]);
  const [jaEnviados,setJaEnviados] = useState<{id:string;nome:string}[]>([]);
  useEffect(()=>{if(ready)listRecipients().then(setRecipients).catch(()=>toast.error('Não foi possível listar destinatários.'));},[ready]);
  useEffect(()=>{if(!ready||!docId||!recipients.length){setJaEnviados([]);return;}carregarEncaminhados(docId).then(ids=>setJaEnviados(ids.map(i=>recipients.find(r=>r.id===i)).filter((r):r is {id:string;nome:string}=>!!r)));},[ready,docId,recipients]);

  async function comProcesso(documento: Documento, processoId?: string | null) {
    if (!processoId) return documento;
    const { data, error } = await supabase.from('processos').select('numero,tema,created_at,encerrado_em').eq('id', processoId).single();
    if (error || !data) { toast.error('Não foi possível carregar o processo.'); return documento; }
    if (data.encerrado_em) { toast.error('Este processo está encerrado e arquivado. Não é possível criar novos documentos nele.'); return documento; }
    return { ...documento, processo: { numero: data.numero, ano: new Date(data.created_at).getFullYear(), tema: data.tema } };
  }

  useEffect(() => {
    if (!ready) return;
    setDocId(id);
    if (id) {
      supabase.from("documentos").select("dados,criado_por,status,analise_admin,processo_id").eq("id", id).single().then(async ({ data }) => {
        if (!data || !podeEditarDocumento(isAdmin, session?.user.id ?? '', data)) {
          toast.error("Este documento não está disponível para edição.");
          navigate({to:'/historico'});
          return;
        }
        if (data) {
          setDocumentStatus(data.status);
          const d = data.dados as unknown as Documento;
          setDoc(await comProcesso(d, data.processo_id));
          setListaTexto(listaParaTexto(d.lista));
        }
      });
    } else {
      Promise.all([proximoNumeroDocumento('Ofício', new Date().getFullYear()), supabase.from('paineis').select('nome,funcao,tipo_painel,setor,responsavel').eq('user_id',session?.user.id ?? '').maybeSingle()]).then(async ([n, {data: titular}]) => {
        if (!isAdmin && !titular) { toast.error('Seu painel precisa de nome e função.'); navigate({to:'/painel'}); return; }
        const model = modeloGravacao(n, !isAdmin && titular ? titular : undefined);
        setDocumentStatus('desenvolvendo');
        if(titular?.tipo_painel==='setor') { model.setor=titular.setor;model.de=titular.setor;model.sigla=siglaSetor(titular.setor);model.assinante='';model.cargo=''; }
        setDoc(await comProcesso(model, processo));
        setListaTexto("");
      }).catch(error => toast.error(error instanceof Error ? error.message : 'Falha ao consultar numeração.'));
    }
  }, [ready, id, isAdmin, session?.user.id, processo]);

  if (!ready || !doc) return null;
  const set = <K extends keyof Documento>(k: K, v: Documento[K]) => setDoc({ ...doc, [k]: v });
  const full: Documento = { ...doc, lista: textoParaLista(listaTexto) };

  async function revisar() {
    if (!doc) return;
    setAiLoading(true);
    try {
      const r = await reviewWithAI({
        data: { tipo: doc.tipo, para: doc.para, assunto: doc.assunto, vocativo: doc.vocativo, corpo: doc.corpo, fecho: doc.fecho, instrucoes },
      });
      if (!r) throw new Error("A revisão não retornou um texto. Tente novamente.");
      setDoc((current) => current ? { ...current, ...r, corpoFormatado: r.corpo === current.corpo ? current.corpoFormatado : undefined } : current);
      toast.success("Texto revisado pela IA. Confira antes de gerar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na revisão");
    } finally {
      setAiLoading(false);
    }
  }

  async function salvar() {
    if (!session?.user.id) { toast.error('Entre novamente para salvar.'); return; }
    if (!numeroValido(full.numero)) { toast.error('Informe um número inteiro maior que zero.'); return; }
    setSaving(true);
    let dados = full;
    let {data:saved,error} = await supabase.rpc('salvar_documento',{_id:(docId ?? null) as string,_dados:dados as never,_processo:(processo ?? null) as string});
    if (error && !docId && /número já está utilizado/i.test(error.message)) {
      try { const numero = await proximoNumeroDocumento(full.tipo, full.ano); dados = { ...full, numero }; ({data:saved,error} = await supabase.rpc('salvar_documento',{_id:null as unknown as string,_dados:dados as never,_processo:(processo ?? null) as string})); if (!error) toast.info(`Número ajustado automaticamente para ${String(numero).padStart(3,'0')}.`); } catch { /* mantém erro original */ }
    }
    const res = error || !saved ? {error:error??new Error('Falha'),data:null} : await supabase.from('documentos').select('id,dados,status').eq('id',saved).single();
    setSaving(false);
    if (res.error || !res.data) return toast.error(res.error?.message ?? "Erro ao salvar"), undefined;
    setDocumentStatus(res.data.status);
    setDocId(res.data.id);
    setDoc(res.data.dados as unknown as Documento);
    toast.success("Documento salvo");
    return res.data.id;
  }

  async function confirmarSenhaEmissao() {
    setSending(true);
    try { await conferirSenha({data:{password:senhaEmissao}}); setPedirSenha(false); setSenhaEmissao(''); await encaminhar(true); }
    catch(e) { toast.error(e instanceof Error?e.message:'Senha incorreta.'); }
    finally { setSending(false); }
  }

  async function encaminhar(assinar:boolean) {
    const destinos = Array.from(new Set([...selectedRecipients.map(r=>r.id), ...(recipientId ? [recipientId] : [])]));
    if(!destinos.length)return;
    setSending(true);
    try {
      const savedId=await salvar();if(!savedId)return;
      const {error}=await supabase.rpc('enviar_documento_multiplos',{_id:savedId,_destinos:destinos,_assinar:assinar,_finalidade:purpose});
      if(error)throw error;
      toast.success(assinar?'Documento enviado para assinatura':'Documento enviado');
      navigate({to:'/historico'});
    } catch(error) { toast.error(error instanceof Error?error.message:'Não foi possível enviar.'); }
    finally {setSending(false);}
  }
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="mr-auto text-2xl font-bold text-primary-foreground">{docId ? "Editar documento" : "Novo documento"}</h1>
            {docId && (
              <Button variant="outline" size="sm" onClick={() => navigate({ to: "/", search: {} })}>
                <FilePlus2 className="h-4 w-4" /> Novo
              </Button>
            )}
          </div>

          <Group title="Identificação">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <F label="Tipo">
                <select disabled={!!docId || saving} aria-label="Tipo do documento" className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm" value={doc.tipo} onChange={async (e) => {
                  const tipo = e.target.value;
                  setSaving(true);
                  try {
                    const numero = await proximoNumeroDocumento(tipo, doc.ano);
                    setDoc(current => current ? { ...current, tipo, numero } : current);
                  } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao consultar numeração.'); }
                  finally { setSaving(false); }
                }}>
                  <option>Ofício</option>
                  <option>Memorando</option>
                  <option>Edital</option>
                  {doc.tipo !== 'Ofício' && doc.tipo !== 'Memorando' && doc.tipo !== 'Edital' && <option>{doc.tipo}</option>}
                </select>
              </F>
              <F label="Número"><Input aria-label="Número do documento" type="number" min={1} step={1} value={doc.numero} onChange={(e) => set("numero", Number(e.target.value))} /></F>
              <F label="Ano"><Input type="number" disabled={!!docId} value={doc.ano} onChange={(e) => set("ano", Number(e.target.value))} /></F>
              <F label="Sigla"><Input value={doc.sigla} onChange={(e) => set("sigla", e.target.value)} /></F>
              {doc.tipo === 'Edital' && <F label="Classificação do edital" className="col-span-2 sm:col-span-4"><Input aria-label="Classificação do edital" placeholder="Interno, público…" maxLength={200} value={doc.editalQualificador ?? ''} onChange={e=>set('editalQualificador',e.target.value)}/></F>}
              <F label="Cidade"><Input value={doc.cidade} onChange={(e) => set("cidade", e.target.value)} /></F>
              <F label="Data" className="col-span-1 sm:col-span-3"><Input type="date" value={doc.data} onChange={(e) => set("data", e.target.value)} /></F>
            </div>
          </Group>

          {doc.tipo !== "Edital" && doc.tipo.toLocaleLowerCase("pt-BR") !== "termo" && <Group title="Destinatário">
            <F label="Para"><Input value={doc.para} onChange={(e) => set("para", e.target.value)} /></F>
            <F label="De"><Input value={doc.de} onChange={(e) => set("de", e.target.value)} /></F>
          </Group>}

          <Group title="Conteúdo">
            <F label={doc.tipo === 'Edital' ? 'Tema do edital' : 'Assunto'}><Textarea aria-label={doc.tipo === 'Edital' ? 'Tema do edital' : 'Assunto'} rows={2} value={doc.assunto} onChange={(e) => set("assunto", e.target.value)} /></F>
            <F label="Vocativo"><Input value={doc.vocativo} onChange={(e) => set("vocativo", e.target.value)} /></F>
            <F label="Texto (separe parágrafos com uma linha em branco)">
                <RichTextEditor text={doc.corpo} content={doc.corpoFormatado} onChange={(corpo, corpoFormatado) => setDoc((current) => current ? { ...current, corpo, corpoFormatado } : current)} />
            </F>
            {(["fotos", "anexos"] as const).map((campo) => (
              <div key={campo} className="space-y-2">
                <Label className="text-xs">{campo === "fotos" ? "Fotos no texto" : "Anexos (imagens ao final do documento)"}</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label={campo === "fotos" ? "Adicionar fotos" : "Adicionar anexos"} onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []); e.target.value = "";
                  try { const novas = await Promise.all(files.map(prepararFoto)); setDoc((c) => c ? { ...c, [campo]: [...(c[campo] ?? []), ...novas] } : c); }
                  catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível adicionar."); }
                }} />
                {(doc[campo] ?? []).map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <img src={f.src} alt="" className="h-12 w-12 rounded object-cover" />
                    <Input placeholder="Legenda (opcional)" value={f.legenda} onChange={(e) => setDoc((c) => c ? { ...c, [campo]: (c[campo] ?? []).map((x, j) => j === i ? { ...x, legenda: e.target.value } : x) } : c)} />
                    <Button type="button" size="icon" variant="outline" aria-label="Remover" onClick={() => setDoc((c) => c ? { ...c, [campo]: (c[campo] ?? []).filter((_, j) => j !== i) } : c)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            ))}
            <div className="rounded-lg border border-accent bg-accent/15 p-3">
              <Label className="text-xs">Orientação para a IA (opcional)</Label>
              <Input className="mt-1.5 bg-card" placeholder="Ex.: deixar mais curto, citar o horário 14h…" value={instrucoes} onChange={(e) => setInstrucoes(e.target.value)} />
              <Button className="mt-3 w-full" variant="secondary" onClick={revisar} disabled={aiLoading}>
                <Sparkles className="h-4 w-4" /> {aiLoading ? "Revisando…" : "Revisar e melhorar com IA"}
              </Button>
            </div>
          </Group>

          <Group title="Encerramento">
            {doc.tipo !== 'Edital' && <F label="Fecho"><Textarea rows={2} value={doc.fecho} onChange={(e) => set("fecho", e.target.value)} /></F>}
          </Group>

          {<Group title="Encaminhamento">
            {jaEnviados.map(p=><div className="flex items-center gap-2" key={'e'+p.id}><Check className="h-4 w-4 text-primary"/><span className="mr-auto font-semibold">{p.nome}</span><span className="text-xs text-muted-foreground">já enviado</span></div>)}
            {selectedRecipients.filter(p=>!jaEnviados.some(j=>j.id===p.id)).map(p=><div className="flex items-center gap-2" key={p.id}><span className="mr-auto font-semibold">{p.nome}</span><Button size="icon" variant="ghost" aria-label={`Remover ${p.nome}`} onClick={()=>setSelectedRecipients(current=>current.filter(r=>r.id!==p.id))}><X className="h-4 w-4"/></Button></div>)}
            <Input aria-label="Destinatário do documento" placeholder="Pesquisar setor ou pessoa" value={recipientSearch} onChange={e=>{setRecipientSearch(e.target.value);setRecipientId('');}}/>
            {recipientSearch&&!recipientId&&<div className="flex flex-wrap gap-2">{recipients.filter(p=>!selectedRecipients.some(s=>s.id===p.id)&&!jaEnviados.some(s=>s.id===p.id)&&p.nome.toLocaleLowerCase('pt-BR').includes(recipientSearch.toLocaleLowerCase('pt-BR'))).map(p=><Button key={p.id} variant="outline" onClick={()=>{setRecipientId(p.id);setRecipientSearch(p.nome);}}>{p.nome}</Button>)}</div>}
            <Button size="icon" variant="outline" aria-label="Adicionar destinatário" title="Adicionar destinatário" disabled={!recipientId} onClick={()=>{const p=recipients.find(r=>r.id===recipientId);if(p)setSelectedRecipients(current=>current.some(r=>r.id===p.id)?current:[...current,p]);setRecipientId('');setRecipientSearch('');}}><Plus className="h-4 w-4"/></Button>
            <F label="Finalidade da assinatura"><select aria-label="Finalidade da assinatura" className="h-9 w-full rounded-md border bg-card px-2" value={purpose} onChange={e=>setPurpose(e.target.value==='ciencia'?'ciencia':'deferimento')}><option value="deferimento">Deferimento</option><option value="ciencia">Somente ciência</option></select></F>
            <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={(!recipientId&&!selectedRecipients.length)||sending||saving} onClick={()=>encaminhar(false)}>Enviar para</Button><Button disabled={(!recipientId&&!selectedRecipients.length)||sending||saving} onClick={()=>{setSenhaEmissao('');setPedirSenha(true);}}>Assinar e enviar para assinatura</Button></div>
          </Group>}
          <div className="sticky bottom-0 -mx-4 flex gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
            <Button variant="outline" className="flex-1" onClick={salvar} disabled={saving}>
              <Save className="h-4 w-4" /> {documentStatus !== "desenvolvendo" ? "Atualizar doc" : "Salvar"}
            </Button>
            <Button
              className="flex-1"
              disabled={generating || saving || uploading || !podeExportar(panelType,documentStatus)}
              onClick={async () => {
                setGenerating(true);
                try {
                  const savedId = panelType==='setor'?docId:await salvar();
                  if (!savedId) return;
                  const {data:saved,error} = await supabase.from("documentos").select("dados").eq("id",savedId).single();
                  if (error || !saved) throw new Error("Não foi possível carregar o documento para gerar o PDF. Tente novamente.");
                  await gerarPDF(saved.dados as unknown as Documento, true, await carregarExtras(savedId));
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF.");
                } finally { setGenerating(false); }
              }}
            >
              <Download className="h-4 w-4" /> {generating ? "Gerando…" : "Gerar PDF"}
            </Button>
          </div>
        </section>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary-foreground">Pré-visualização</p>
          <DocumentPreview doc={full} />
        </aside>
      </main>
      <Dialog open={pedirSenha} onOpenChange={setPedirSenha}><DialogContent><DialogHeader><DialogTitle>Assinar e enviar para assinatura</DialogTitle></DialogHeader><p className="text-sm">Confirme a sua senha para emitir e assinar o documento. Depois ele será enviado aos selecionados.</p><form className="space-y-3" onSubmit={e=>{e.preventDefault();confirmarSenhaEmissao();}}><Label htmlFor="senha-emissao">Sua senha</Label><Input id="senha-emissao" type="password" autoComplete="current-password" required value={senhaEmissao} onChange={e=>setSenhaEmissao(e.target.value)}/><Button className="w-full" type="submit" disabled={sending||!senhaEmissao}>{sending?'Conferindo…':'Assinar e enviar'}</Button></form></DialogContent></Dialog>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border bg-card p-4">
      <legend className="rounded-sm bg-card px-2 font-sans text-sm font-semibold text-primary">{title}</legend>
      {children}
    </fieldset>
  );
}

function F({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

