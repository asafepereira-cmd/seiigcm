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
import { reviewWithAI } from "@/lib/server.functions";
import { gerarPDF } from "@/lib/pdf";
import { carregarExtras } from "@/lib/assinaturas-eletronicas";
import { podeEditarDocumento } from "@/lib/document-access";
import { lerAssinaturaPng } from "@/lib/assinatura";
import { dataExtenso, modeloGravacao, numeroFormatado, type Documento, type Participante } from "@/lib/documento";

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

async function proximoNumero(ano: number) {
  const { data } = await supabase.from("documentos").select("numero").eq("ano", ano).order("numero", { ascending: false }).limit(1);
  return (data?.[0]?.numero ?? 0) + 1;
}

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
  const signatureInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready) return;
    setDocId(id);
    if (id) {
      supabase.from("documentos").select("dados,criado_por,status,analise_admin").eq("id", id).single().then(({ data }) => {
        if (!data || !podeEditarDocumento(isAdmin, session?.user.id ?? '', data)) {
          toast.error("Este documento não está disponível para edição.");
          navigate({to:'/historico'});
          return;
        }
        if (data) {
          const d = data.dados as unknown as Documento;
          setDoc(d);
          setListaTexto(listaParaTexto(d.lista));
        }
      });
    } else {
      Promise.all([proximoNumero(new Date().getFullYear()), supabase.from('paineis').select('nome,funcao').eq('user_id',session?.user.id ?? '').maybeSingle()]).then(([n, {data: titular}]) => {
        if (!isAdmin && !titular) { toast.error('Seu painel precisa de nome e função.'); navigate({to:'/painel'}); return; }
        setDoc(modeloGravacao(n, !isAdmin && titular ? titular : undefined));
        setListaTexto("");
      });
    }
  }, [ready, id, isAdmin, session?.user.id]);

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
    setSaving(true);
    const {data:saved,error} = await supabase.rpc('salvar_documento',{_id:docId ?? null,_dados:full as never,_processo:processo ?? null});
    const res = error || !saved ? {error:error??new Error('Falha'),data:null} : await supabase.from('documentos').select('id,dados').eq('id',saved).single();
    setSaving(false);
    if (res.error || !res.data) return toast.error("Erro ao salvar"), undefined;
    setDocId(res.data.id);
    setDoc(res.data.dados as unknown as Documento);
    toast.success("Documento salvo");
    return res.data.id;
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

          <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/processos">Novo processo</Link></Button><Button variant="outline" onClick={()=>navigate({to:"/",search:{}})}>Novo documento</Button></div>
          <Group title="Identificação">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <F label="Tipo">
                <select disabled={!!docId} className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm" value={doc.tipo} onChange={(e) => set("tipo", e.target.value)}>
                  <option>Ofício</option>
                  <option>Memorando</option>
                </select>
              </F>
              <F label="Número"><Input type="number" disabled min={1} value={doc.numero} onChange={(e) => set("numero", Number(e.target.value))} /></F>
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

          <Group title="Lista (opcional)">
            <F label="Título da lista"><Input value={doc.tituloLista} onChange={(e) => set("tituloLista", e.target.value)} /></F>
            <F label="Um por linha — Nome – Função">
              <Textarea rows={5} placeholder={"Ana Clara – Câmera\nBruno Alves – Áudio"} value={listaTexto} onChange={(e) => setListaTexto(e.target.value)} />
            </F>
          </Group>

          <Group title="Encerramento">
            <F label="Fecho"><Textarea rows={2} value={doc.fecho} onChange={(e) => set("fecho", e.target.value)} /></F>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Assinante"><Input value={doc.assinante} onChange={(e) => set("assinante", e.target.value)} /></F>
              <F label="Cargo"><Input value={doc.cargo} onChange={(e) => set("cargo", e.target.value)} /></F>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Minha assinatura (PNG sem fundo)</Label>
              <input ref={signatureInput} type="file" accept="image/png,.png" className="hidden" aria-label="Enviar assinatura PNG"
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  e.currentTarget.value = "";
                  if (!file) return;
                  setUploading(true);
                  try {
                    const assinaturaPng = await lerAssinaturaPng(file);
                    setDoc((current) => current ? { ...current, assinaturaPng } : current);
                    toast.success("Assinatura inserida");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Não foi possível inserir a assinatura.");
                  } finally { setUploading(false); }
                }} />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => signatureInput.current?.click()}>
                  <Upload className="h-4 w-4" />{uploading ? "Enviando…" : doc.assinaturaPng ? "Trocar assinatura" : "Enviar assinatura PNG"}
                </Button>
                {doc.assinaturaPng && <Button variant="ghost" size="icon" aria-label="Remover assinatura" title="Remover assinatura" onClick={() => set("assinaturaPng", undefined)}><X className="h-4 w-4" /></Button>}
              </div>
              {doc.assinaturaPng && <div className="flex h-20 items-center justify-center rounded-md border bg-paper p-2"><img src={doc.assinaturaPng} alt="Minha assinatura" className="max-h-full max-w-full object-contain" /></div>}
            </div>
          </Group>

          <Group title="Página complementar">
            <Button variant={doc.despacho ? "secondary" : "outline"} className="w-full justify-between" aria-pressed={Boolean(doc.despacho)} onClick={() => set("despacho", doc.despacho ? undefined : "pedagogica")}>
              Inserir página de despacho: {doc.despacho ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3 fill-current" />}
            </Button>
            {doc.despacho && <div className="grid grid-cols-3 gap-2" role="group" aria-label="Assinatura da gestão">
              {([ ["pedagogica", "Gestora Ped."], ["administrativa", "Gestora Adm."], ["ambas", "Os dois"] ] as const).map(([value, label]) => (
                <Button key={value} size="sm" className="h-auto min-h-9 whitespace-normal px-2" variant={doc.despacho === value ? "default" : "outline"} aria-pressed={doc.despacho === value} onClick={() => set("despacho", value)}>{label}</Button>
              ))}
            </div>}
          </Group>

          <div className="sticky bottom-0 -mx-4 flex gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
            <Button variant="outline" className="flex-1" onClick={salvar} disabled={saving}>
              <Save className="h-4 w-4" /> Salvar
            </Button>
            <Button
              className="flex-1"
              disabled={generating || saving || uploading}
              onClick={async () => {
                setGenerating(true);
                try {
                  const savedId = await salvar();
                  if (!savedId) return;
                  const {data:saved} = await supabase.from("documentos").select("dados").eq("id",savedId).single();
                  if(saved) await gerarPDF(saved.dados as unknown as Documento, true, await carregarExtras(savedId));
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
          {doc.despacho && <div className="mt-5"><p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary-foreground">Página de despacho</p><DispatchPreview opcao={doc.despacho} /></div>}
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

