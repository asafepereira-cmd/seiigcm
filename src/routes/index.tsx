import { CATALOGO_TIPOS, TIPOS_DOCUMENTO, modeloTipo } from '@/lib/tipos-documento';
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, Save, Sparkles, FilePlus2, X, Plus, PenLine, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { DocumentPreview } from "@/components/DocumentPreview";
import { ProcessTree } from '@/components/ProcessTree';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { signAuthorDocument } from '@/lib/assinatura.functions';
import { corrigirNome } from '@/lib/document-identity';
import { RichTextEditor } from "@/components/RichTextEditor";
import { UnitTemplates } from '@/components/UnitTemplates';
import { tipoLivre } from '@/lib/document-models';
import { documentoSemDestinatario } from '@/lib/documento';
import { prepararFoto } from "@/lib/document-photo";
import { richParagraphs } from "@/lib/rich-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { destinatarios, signatariosDocumento } from "@/lib/setor.functions";
import { precisaSalvar, type SignatarioEditor } from '@/lib/document-editor';
import { podeExportar } from "@/lib/sector";
import { reviewWithAI } from "@/lib/server.functions";
import { gerarPDF } from "@/lib/pdf";
import { carregarExtras } from "@/lib/assinaturas-eletronicas";
import { podeEditarDocumento } from "@/lib/document-access";
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
  const loadSigners = useServerFn(signatariosDocumento);
  const [panelType,setPanelType] = useState('individual');
  const [documentStatus,setDocumentStatus] = useState('desenvolvendo');
  const [recipients,setRecipients] = useState<{id:string;nome:string}[]>([]);
  const [recipientSearch,setRecipientSearch] = useState('');
  const [recipientId,setRecipientId] = useState('');
  const [selectedRecipients,setSelectedRecipients] = useState<SignatarioEditor[]>([]);
  const [purpose,setPurpose] = useState<'deferimento'|'ciencia'>('deferimento');
  const [requestSignatures,setRequestSignatures] = useState(true);
  const forwardingRef = useRef<HTMLFieldSetElement>(null);
  const [sending,setSending] = useState(false);
  const signAuthor = useServerFn(signAuthorDocument);
  const [signOpen,setSignOpen] = useState(false);
  const [signing,setSigning] = useState(false);
  const [password,setPassword] = useState('');
  const [signName,setSignName] = useState('');
  const [signRole,setSignRole] = useState('');
  const [signCpf,setSignCpf] = useState('');
  const [consent,setConsent] = useState(false);
  const [authorSigned,setAuthorSigned] = useState(false);
  const [savedSnapshot,setSavedSnapshot] = useState('');
  const [activeProcess,setActiveProcess] = useState<string | null>(processo ?? null);
  const [treeDocs,setTreeDocs] = useState<{id:string;dados:Documento}[]>([]);
  useEffect(() => {
    if (!ready || !activeProcess) { setTreeDocs([]); return; }
    supabase.from('documentos').select('id,dados').eq('processo_id',activeProcess).order('created_at').then(({data,error}) => {
      if (error) toast.error('Não foi possível carregar a árvore do processo.');
      else setTreeDocs((data ?? []) as unknown as {id:string;dados:Documento}[]);
    });
  },[ready,activeProcess,docId,savedSnapshot]);
  useEffect(()=>{if(!ready)return;supabase.from('paineis').select('tipo_painel').eq('user_id',session?.user.id??'').maybeSingle().then(({data})=>setPanelType(data?.tipo_painel??'individual'));},[ready,session?.user.id]);
  useEffect(()=>{if(ready)listRecipients().then(setRecipients).catch(()=>toast.error('Não foi possível listar destinatários.'));},[ready]);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setSelectedRecipients([]); setRecipientSearch(''); setRecipientId(''); setPurpose('deferimento');
    if (id) loadSigners({ data: { id } }).then(result => {
      if (!cancelled) { setSelectedRecipients(result.selected); setPurpose(result.purpose); }
    }).catch(() => { if (!cancelled) toast.error('Não foi possível recuperar os signatários anteriores.'); });
    return () => { cancelled = true; };
  }, [ready, id]);

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
      supabase.from("documentos").select("dados,criado_por,status,analise_admin,processo_id,versao").eq("id", id).single().then(async ({ data }) => {
        if (!data || !podeEditarDocumento(isAdmin, session?.user.id ?? '', data)) {
          toast.error("Este documento não está disponível para edição.");
          navigate({to:'/historico'});
          return;
        }
        if (data) {
          setDocumentStatus(data.status);
          const d = data.dados as unknown as Documento;
          const loaded = await comProcesso(d, data.processo_id);
          setDoc(loaded);
          setSavedSnapshot(JSON.stringify(loaded));
          setActiveProcess(data.processo_id);
          const {data:signatures} = await supabase.from('solicitacoes_assinatura').select('assinado_em').eq('documento_id',id).eq('versao',data.versao).like('gestora','emissor:%').not('assinado_em','is',null);
          setAuthorSigned(!!signatures?.length);
          setListaTexto(listaParaTexto(d.lista));
        }
      });
    } else {
      setAuthorSigned(false); setSavedSnapshot(''); setActiveProcess(processo ?? null);
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
    if (!precisaSalvar(full, savedSnapshot, docId)) return docId;
    setSaving(true);
    let dados = full;
    let {data:saved,error} = await supabase.rpc('salvar_documento',{_id:(docId ?? null) as string,_dados:dados as never,_processo:(processo ?? null) as string});
    if (error && !docId && /número já está utilizado/i.test(error.message)) {
      try { const numero = await proximoNumeroDocumento(full.tipo, full.ano); dados = { ...full, numero }; ({data:saved,error} = await supabase.rpc('salvar_documento',{_id:null as unknown as string,_dados:dados as never,_processo:(processo ?? null) as string})); if (!error) toast.info(`Número ajustado automaticamente para ${String(numero).padStart(3,'0')}.`); } catch { /* mantém erro original */ }
    }
    const res = error || !saved ? {error:error??new Error('Falha'),data:null} : await supabase.from('documentos').select('id,dados,status,versao').eq('id',saved).single();
    setSaving(false);
    if (res.error || !res.data) return toast.error(res.error?.message ?? "Erro ao salvar"), undefined;
    setDocumentStatus(res.data.status);
    setDocId(res.data.id);
    const savedDoc = res.data.dados as unknown as Documento;
    setDoc(savedDoc);
    setSavedSnapshot(JSON.stringify(savedDoc));
    const { data: signatures } = await supabase.from('solicitacoes_assinatura').select('id').eq('documento_id',res.data.id).eq('versao',res.data.versao).like('gestora','emissor:%').not('assinado_em','is',null);
    setAuthorSigned(!!signatures?.length);
    toast.success("Documento salvo");
    return res.data.id;
  }
  async function assinarAutor() {
    if (!consent || !password) return;
    setSigning(true);
    try {
      const savedId = await salvar(); if (!savedId) return;
      await signAuthor({data:{id:savedId,password,concordo:true,nome:signName,funcao:signRole,cpf:signCpf}});
      const {data:updated,error} = await supabase.from('documentos').select('status').eq('id',savedId).single();
      if (error || !updated) throw new Error('Não foi possível conferir a assinatura.');
      setDocumentStatus(updated.status); setAuthorSigned(true); setSignOpen(false); setPassword('');
      toast.success('Documento assinado pelo emissor. Agora você pode encaminhá-lo.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível assinar.'); }
    finally { setSigning(false); }
  }

  async function encaminhar(assinar:boolean) {
    const destinos = Array.from(new Set([...selectedRecipients.filter(r=>!r.externo).map(r=>r.id), ...(recipientId ? [recipientId] : [])]));
    const externos = selectedRecipients.filter(r=>r.externo);
    if(!destinos.length&&!externos.length)return;
    if (authorSigned && precisaSalvar(full,savedSnapshot,docId) && !confirm('O texto foi alterado após sua assinatura. Será criada uma nova versão, que precisa de novas assinaturas. Continuar com os signatários selecionados?')) return;
    setSending(true);
    try {
      const savedId=await salvar();if(!savedId)return;
      if (destinos.length) {
        const {error}=await supabase.rpc('enviar_documento_multiplos',{_id:savedId,_destinos:destinos,_assinar:assinar,_finalidade:purpose});
        if(error)throw error;
      }
      if (externos.length && assinar) {
        const { error } = await supabase.rpc('encaminhar_documento', { _id:savedId, _signatarios: externos.map(r=>({nome:r.nome,funcao:r.funcao ?? '',finalidade:purpose})), _prioridade:'normal', _prazo:null as unknown as string, _termo:'' });
        if (error) throw error;
      }
      toast.success(assinar?'Documento enviado para assinatura':'Documento enviado');
      navigate({to:'/historico'});
    } catch(error) { toast.error(error instanceof Error?error.message:'Não foi possível enviar.'); }
    finally {setSending(false);}
  }
  async function baixarPDF() {
    setGenerating(true);
    try {
      const savedId = panelType==='setor'?docId:await salvar();
      if (!savedId) return;
      const {data:saved,error} = await supabase.from('documentos').select('dados').eq('id',savedId).single();
      if (error || !saved) throw new Error('Não foi possível carregar o documento para gerar o PDF.');
      await gerarPDF(saved.dados as unknown as Documento,true,await carregarExtras(savedId));
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível gerar o PDF.'); }
    finally { setGenerating(false); }
  }
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className={`mx-auto grid max-w-7xl gap-6 px-4 py-6 ${activeProcess ? 'lg:grid-cols-[230px_minmax(0,1fr)_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'}`}>
        {activeProcess && <aside className="min-w-0 rounded-md bg-card p-3 lg:sticky lg:top-20 lg:self-start"><ProcessTree title={doc.processo ? `PROCESSO INTERNO ${String(doc.processo.numero).padStart(3,'0')}/${doc.processo.ano}` : 'Documentos do processo'} documents={treeDocs} selected={docId} onSelect={selectedId => {
          if (JSON.stringify(full) !== savedSnapshot && !confirm('Sair sem salvar as alterações?')) return;
          navigate({to:'/',search:{id:selectedId}});
        }}/><Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate({to:'/processos'})}>Ver processo</Button></aside>}
        <section className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="mr-auto text-2xl font-bold text-primary-foreground">{docId ? "Editar documento" : "Novo documento"}</h1>
            {docId && (
              <Button variant="outline" size="sm" onClick={() => navigate({ to: "/", search: {} })}>
                <FilePlus2 className="h-4 w-4" /> Novo
              </Button>
            )}
          </div>

          <div role="toolbar" aria-label="Ações do documento" className="sticky top-0 z-10 flex flex-wrap gap-2 rounded-md border bg-card p-2">
            <Button size="icon" variant="outline" aria-label="Salvar documento" title="Salvar documento" disabled={saving || signing || sending} onClick={salvar}><Save className="size-4" /></Button>
            <Button size="icon" aria-label={authorSigned && !precisaSalvar(full,savedSnapshot,docId) ? 'Assinado pelo emissor' : 'Assinar documento'} title={authorSigned && !precisaSalvar(full,savedSnapshot,docId) ? 'Assinado pelo emissor' : 'Assinar documento'} disabled={saving || signing || sending || (authorSigned && !precisaSalvar(full,savedSnapshot,docId))} onClick={() => {setConsent(false);setPassword('');setSignOpen(true);}}><PenLine className="size-4" /></Button>
            <Button size="icon" variant="outline" aria-label="Encaminhar assinaturas" title="Encaminhar assinaturas" onClick={()=>forwardingRef.current?.scrollIntoView({behavior:'smooth',block:'center'})}><Send className="size-4" /></Button>
            <Button size="icon" variant="outline" aria-label="Baixar PDF" title={generating?'Gerando PDF…':'Baixar PDF'} disabled={generating || saving || signing || sending || uploading || !podeExportar(panelType,documentStatus)} onClick={baixarPDF}><Download className="size-4" /></Button>
          </div>

          <Group title="Identificação">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <F label="Tipo">
                <select disabled={!!docId || saving} aria-label="Tipo do documento" className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm" value={doc.tipo} onChange={async (e) => {
                  const tipo = e.target.value;
                  setSaving(true);
                  try {
                    const numero = await proximoNumeroDocumento(tipo, doc.ano);
                    const m = modeloTipo(tipo);
                    if (tipoLivre(tipo) && doc.corpo.trim() && !confirm('Este tipo começa em branco. Limpar o texto atual?')) return;
                    setDoc(current => current ? { ...current, tipo, numero, ...(tipoLivre(tipo) ? { para: '', de: '', assunto: '', vocativo: '', corpo: '', fecho: '', corpoFormatado: undefined, lista: [], tituloLista: '' } : m && !current.corpo.trim() ? { vocativo: m.vocativo, corpo: m.corpo, fecho: m.fecho, corpoFormatado: undefined } : {}) } : current);
                    if (tipoLivre(tipo)) setListaTexto('');
                  } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao consultar numeração.'); }
                  finally { setSaving(false); }
                }}>
                  {CATALOGO_TIPOS.map(g => <optgroup key={g.grupo} label={g.grupo}>{g.tipos.map(t => <option key={t}>{t}</option>)}</optgroup>)}
                  {!TIPOS_DOCUMENTO.includes(doc.tipo) && <option>{doc.tipo}</option>}
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

          {!documentoSemDestinatario(doc.tipo) && <Group title="Destinatário">
            <F label="Para"><Input value={doc.para} onChange={(e) => set("para", e.target.value)} /></F>
            <F label="De"><Input value={doc.de} onChange={(e) => set("de", e.target.value)} /></F>
          </Group>}

          <Group title="Conteúdo">
            <UnitTemplates doc={full} onApply={model => { setDoc(model); setListaTexto(listaParaTexto(model.lista)); }} />
            <F label={doc.tipo === 'Edital' ? 'Tema do edital' : tipoLivre(doc.tipo) ? 'Título (opcional)' : 'Assunto'}><Textarea aria-label={doc.tipo === 'Edital' ? 'Tema do edital' : tipoLivre(doc.tipo) ? 'Título (opcional)' : 'Assunto'} rows={2} value={doc.assunto} onChange={(e) => set("assunto", e.target.value)} /></F>
            {!tipoLivre(doc.tipo) && <F label="Vocativo"><Input value={doc.vocativo} onChange={(e) => set("vocativo", e.target.value)} /></F>}
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

          {!tipoLivre(doc.tipo) && <Group title="Encerramento">
            <F label="Fecho"><Textarea rows={2} value={doc.fecho} onChange={(e) => set("fecho", e.target.value)} /></F>
          </Group>}

          {<Group title="Encaminhar assinaturas" groupRef={forwardingRef}>
            {selectedRecipients.map(p=><div className="flex items-center gap-2" key={p.id}><span className="mr-auto font-semibold">{p.nome}</span><Button size="icon" variant="ghost" aria-label={`Remover ${p.nome}`} onClick={()=>setSelectedRecipients(current=>current.filter(r=>r.id!==p.id))}><X className="h-4 w-4"/></Button></div>)}
            <Input aria-label="Destinatário do documento" placeholder="Pesquisar setor ou pessoa" value={recipientSearch} onChange={e=>{setRecipientSearch(e.target.value);setRecipientId('');}}/>
            {recipientSearch&&!recipientId&&<div className="flex flex-wrap gap-2">{recipients.filter(p=>!selectedRecipients.some(s=>s.id===p.id)&&p.nome.toLocaleLowerCase('pt-BR').includes(recipientSearch.toLocaleLowerCase('pt-BR'))).map(p=><Button key={p.id} variant="outline" onClick={()=>{setSelectedRecipients(current=>[...current,p]);setRecipientSearch('');}}><Plus className="size-4"/>{p.nome}</Button>)}</div>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={requestSignatures} onChange={e=>setRequestSignatures(e.target.checked)}/>Solicitar assinatura dos destinatários</label>
            <F label="Finalidade da assinatura"><select aria-label="Finalidade da assinatura" className="h-9 w-full rounded-md border bg-card px-2" value={purpose} onChange={e=>setPurpose(e.target.value==='ciencia'?'ciencia':'deferimento')}><option value="deferimento">Deferimento</option><option value="ciencia">Somente ciência</option></select></F>
            <Button disabled={(!recipientId&&!selectedRecipients.length)||sending||saving||signing||(!requestSignatures&&selectedRecipients.some(r=>r.externo))} onClick={()=>encaminhar(requestSignatures)}><Send className="size-4"/>{sending?'Enviando…':requestSignatures?'Enviar para signatários':'Enviar documento'}</Button>
          </Group>}
        </section>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary-foreground">Pré-visualização</p>
          <DocumentPreview doc={full} />
        </aside>
      </main>
      <Dialog open={signOpen} onOpenChange={open => { if (!signing) {setSignOpen(open);setPassword('');} }}>
        <DialogContent><DialogHeader><DialogTitle>Assinar documento</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={e => {e.preventDefault();void assinarAutor();}}>
            {panelType === 'setor' ? <><F label="Nome completo"><Input aria-label="Nome completo do assinante" required value={signName} onChange={e=>setSignName(e.target.value)}/></F><F label="Função"><Input aria-label="Função do assinante" required value={signRole} onChange={e=>setSignRole(e.target.value)}/></F><F label="CPF"><Input aria-label="CPF do assinante" required value={signCpf} onChange={e=>setSignCpf(e.target.value)}/></F></> : <p className="text-sm font-semibold">{corrigirNome(doc.assinante)}<span className="block font-normal">{doc.cargo}</span></p>}
            <F label="Senha da conta"><Input aria-label="Senha para assinar" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></F>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required className="mt-1"/>Li o documento e confirmo minha assinatura eletrônica.</label>
            <Button type="submit" className="w-full" disabled={signing || saving || !password || !consent}>{signing ? 'Assinando…' : 'Confirmar assinatura'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Group({ title, children, groupRef }: { title: string; children: React.ReactNode; groupRef?: React.Ref<HTMLFieldSetElement> }) {
  return (
    <fieldset ref={groupRef} className="space-y-3 rounded-xl border bg-card p-4">
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

