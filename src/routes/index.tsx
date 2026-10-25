import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, Save, Sparkles, FilePlus2, Upload, X, Check, Circle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { DocumentPreview } from "@/components/DocumentPreview";
import { Link } from "@tanstack/react-router";
import { DispatchPreview } from "@/components/DispatchPreview";
import { RichTextEditor } from "@/components/RichTextEditor";
import { richParagraphs } from "@/lib/rich-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { destinatarios } from "@/lib/setor.functions";
import { podeExportar } from "@/lib/sector";
import { reviewWithAI } from "@/lib/server.functions";
import { gerarPDF } from "@/lib/pdf";
import { carregarExtras } from "@/lib/assinaturas-eletronicas";
import { podeEditarDocumento } from "@/lib/document-access";
import { lerAssinaturaPng } from "@/lib/assinatura";
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
  const [recipients,setRecipients] = useState<{id:string;nome:string}[]>([]);
  const [recipientSearch,setRecipientSearch] = useState('');
  const [recipientId,setRecipientId] = useState('');
  const [purpose,setPurpose] = useState<'deferimento'|'ciencia'>('deferimento');
  const [sending,setSending] = useState(false);
  useEffect(()=>{if(!ready)return;supabase.from('paineis').select('tipo_painel').eq('user_id',session?.user.id??'').maybeSingle().then(({data})=>setPanelType(data?.tipo_painel??'individual'));},[ready,session?.user.id]);
  useEffect(()=>{if(panelType==='setor'||isAdmin)listRecipients().then(setRecipients).catch(()=>toast.error('Não foi possível listar destinatários.'));},[panelType,isAdmin]);
  const signatureInput = useRef<HTMLInputElement>(null);

  async function comProcesso(documento: Documento, processoId?: string | null) {
    if (!processoId) return documento;
    const { data, error } = await supabase.from('processos').select('numero,tema,created_at').eq('id', processoId).single();
    if (error || !data) { toast.error('Não foi possível carregar o processo.'); return documento; }
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
    const {data:saved,error} = await supabase.rpc('salvar_documento',{_id:(docId ?? null) as string,_dados:full as never,_processo:(processo ?? null) as string});
    const res = error || !saved ? {error:error??new Error('Falha'),data:null} : await supabase.from('documentos').select('id,dados,status').eq('id',saved).single();
    setSaving(false);
    if (res.error || !res.data) return toast.error(res.error?.message ?? "Erro ao salvar"), undefined;
    setDocumentStatus(res.data.status);
    setDocId(res.data.id);
    setDoc(res.data.dados as unknown as Documento);
    toast.success("Documento salvo");
    return res.data.id;
  }

  async function encaminhar(assinar:boolean) {
    if(!recipientId)return;
    setSending(true);
    try {
      const savedId=await salvar();if(!savedId)return;
      const {error}=await supabase.rpc('enviar_documento_setor',{_id:savedId,_destino:recipientId,_assinar:assinar,_finalidade:purpose});
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
                  {doc.tipo !== 'Ofício' && doc.tipo !== 'Memorando' && <option>{doc.tipo}</option>}
                </select>
              </F>
              <F label="Número"><Input aria-label="Número do documento" type="number" min={1} step={1} value={doc.numero} onChange={(e) => set("numero", Number(e.target.value))} /></F>
              <F label="Ano"><Input type="number" disabled={!!docId} value={doc.ano} onChange={(e) => set("ano", Number(e.target.value))} /></F>
              <F label="Sigla"><Input value={doc.sigla} onChange={(e) => set("sigla", e.target.value)} /></F>
              <F label="Cidade"><Input value={doc.cidade} onChange={(e) => set("cidade", e.target.value)} /></F>
              <F label="Data" className="col-span-1 sm:col-span-3"><Input type="date" value={doc.data} onChange={(e) => set("data", e.target.value)} /></F>
            </div>
          </Group>

          <Group title="Destinatário">
            <F label="Para"><Input value={doc.para} onChange={(e) => set("para", e.target.value)} /></F>
            <F label="De"><Input value={doc.de} onChange={(e) => set("de", e.target.value)} /></F>
          </Group>

          <Group title="Conteúdo">
            <F label="Assunto"><Textarea rows={2} value={doc.assunto} onChange={(e) => set("assunto", e.target.value)} /></F>
            <F label="Vocativo"><Input value={doc.vocativo} onChange={(e) => set("vocativo", e.target.value)} /></F>
            <F label="Texto (separe parágrafos com uma linha em branco)">
                <RichTextEditor text={doc.corpo} content={doc.corpoFormatado} onChange={(corpo, corpoFormatado) => setDoc((current) => current ? { ...current, corpo, corpoFormatado } : current)} />
            </F>
            <div className="rounded-lg border border-accent bg-accent/15 p-3">
              <Label className="text-xs">Orientação para a IA (opcional)</Label>
              <Input className="mt-1.5 bg-card" placeholder="Ex.: deixar mais curto, citar o horário 14h…" value={instrucoes} onChange={(e) => setInstrucoes(e.target.value)} />
              <Button className="mt-3 w-full" variant="secondary" onClick={revisar} disabled={aiLoading}>
                <Sparkles className="h-4 w-4" /> {aiLoading ? "Revisando…" : "Revisar e melhorar com IA"}
              </Button>
            </div>
          </Group>

          <Group title="Encerramento">
            <F label="Fecho"><Textarea rows={2} value={doc.fecho} onChange={(e) => set("fecho", e.target.value)} /></F>
          </Group>

          {(panelType==='setor'||isAdmin) && <Group title="Encaminhamento">
            <Input aria-label="Destinatário do documento" placeholder="Pesquisar setor ou pessoa" value={recipientSearch} onChange={e=>{setRecipientSearch(e.target.value);setRecipientId('');}}/>
            {recipientSearch&&!recipientId&&<div className="flex flex-wrap gap-2">{recipients.filter(p=>p.nome.toLocaleLowerCase('pt-BR').includes(recipientSearch.toLocaleLowerCase('pt-BR'))).map(p=><Button key={p.id} variant="outline" onClick={()=>{setRecipientId(p.id);setRecipientSearch(p.nome);}}>{p.nome}</Button>)}</div>}
            <F label="Finalidade da assinatura"><select aria-label="Finalidade da assinatura" className="h-9 w-full rounded-md border bg-card px-2" value={purpose} onChange={e=>setPurpose(e.target.value==='ciencia'?'ciencia':'deferimento')}><option value="deferimento">Deferimento</option><option value="ciencia">Somente ciência</option></select></F>
            <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!recipientId||sending||saving} onClick={()=>encaminhar(false)}>Enviar para</Button><Button disabled={!recipientId||sending||saving} onClick={()=>encaminhar(true)}>Enviar e solicitar assinatura</Button></div>
          </Group>}
          <div className="sticky bottom-0 -mx-4 flex gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
            <Button variant="outline" className="flex-1" onClick={salvar} disabled={saving}>
              <Save className="h-4 w-4" /> Salvar
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

