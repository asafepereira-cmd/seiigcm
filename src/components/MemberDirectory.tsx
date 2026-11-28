import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Download, FileText, Paperclip, Search, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { baixarAnexoIntegrante, excluirAnexoIntegrante, listarIntegrantes, obterIntegrante, prepararAnexoIntegrante, registrarAnexoIntegrante, registrarOcorrenciaIntegrante } from '@/lib/integrantes.functions';
import { listarUnidades } from '@/lib/unidades.functions';
import { siglaUnidade, type Unidade } from '@/lib/unidades';
import { gerarMinutaPDF } from '@/lib/minuta-pdf';
import { hojeISO } from '@/lib/documento';

type Integrante = Awaited<ReturnType<typeof listarIntegrantes>>[number];
type Dossie = Awaited<ReturnType<typeof obterIntegrante>>;

export function MemberDirectory() {
  const [rows, setRows] = useState<Integrante[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string>();
  const [dossie, setDossie] = useState<Dossie>();
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [occurrence, setOccurrence] = useState({ tipo: 'Advertência' as 'Advertência' | 'Processo' | 'Ocorrência', titulo: '', descricao: '', ocorridoEm: hojeISO() });
  const listar = useServerFn(listarIntegrantes);
  const carregarUnidades = useServerFn(listarUnidades);
  const obter = useServerFn(obterIntegrante);
  const preparar = useServerFn(prepararAnexoIntegrante);
  const registrar = useServerFn(registrarAnexoIntegrante);
  const baixar = useServerFn(baixarAnexoIntegrante);
  const excluir = useServerFn(excluirAnexoIntegrante);
  const salvarOcorrencia = useServerFn(registrarOcorrenciaIntegrante);

  async function carregar() {
    setLoading(true);
    try {
      const [lista, listaUnidades] = await Promise.all([listar(), carregarUnidades().catch(() => [] as Unidade[])]);
      setRows(lista);
      setUnidades(listaUnidades);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível consultar.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void carregar(); }, []);

  async function abrir(id: string) {
    setSelected(id); setDossie(undefined); setBusy(true);
    try { setDossie(await obter({ data: { id } })); } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível abrir o dossiê.'); }
    finally { setBusy(false); }
  }

  async function upload(file?: File) {
    if (!file || !selected) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) { toast.error('Envie PDF, JPG ou PNG de até 10 MB.'); return; }
    setBusy(true);
    try {
      const preparado = await preparar({ data: { integranteId: selected, nome: file.name.slice(0, 200), mimeType: file.type as 'application/pdf' | 'image/jpeg' | 'image/png', tamanho: file.size } });
      const { error } = await supabase.storage.from('integrantes-documentos').uploadToSignedUrl(preparado.path, preparado.token, file, { contentType: file.type });
      if (error) throw error;
      await registrar({ data: { integranteId: selected, nome: preparado.nome, path: preparado.path, mimeType: file.type as 'application/pdf' | 'image/jpeg' | 'image/png', tamanho: file.size } });
      toast.success('Documento anexado ao dossiê.'); await abrir(selected);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível anexar.'); }
    finally { setBusy(false); }
  }

  async function adicionarOcorrencia() {
    if (!selected) return;
    setBusy(true);
    try {
      await salvarOcorrencia({ data: { integranteId: selected, ...occurrence } });
      setOccurrence({ tipo: 'Advertência', titulo: '', descricao: '', ocorridoEm: hojeISO() });
      toast.success('Registro incluído na linha do tempo.'); await abrir(selected);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível registrar.'); }
    finally { setBusy(false); }
  }

  const termo = search.trim().toLocaleLowerCase('pt-BR');
  const filtrados = rows.filter(r => !termo || [r.nome, r.cpf, r.funcao, r.unidade, r.vinculo].some(v => v.toLocaleLowerCase('pt-BR').includes(termo)));

  return <>
    <section className="rounded-lg border bg-card p-4 text-card-foreground">
      <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar integrante" placeholder="Buscar por nome, documento, função ou unidade" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <p className="mt-3 text-sm text-muted-foreground">{filtrados.length} de {rows.length} integrante(s)</p>
      {loading ? <p className="py-10 text-center">Carregando integrantes…</p> : !filtrados.length ? <p className="py-10 text-center text-muted-foreground">Nenhum integrante encontrado.</p> : <ul className="mt-4 divide-y">{filtrados.map(r => <li key={r.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><button className="text-left font-semibold text-primary underline-offset-4 hover:underline" onClick={() => void abrir(r.id)}>{r.nome}</button><p className="mt-1 text-sm text-muted-foreground">{r.funcao || r.vinculo} · {r.unidade}{r.unidade_id ? ` (${siglaUnidade(r.unidade_id, unidades)})` : ''}</p><p className="mt-1 text-xs text-muted-foreground">Ingresso: {r.data_ingresso.split('-').reverse().join('/')} · {r.situacao}</p></div><Button variant="outline" onClick={() => void abrir(r.id)}>Abrir ficha</Button></li>)}</ul>}
    </section>

    <Dialog open={!!selected} onOpenChange={open => { if (!open) { setSelected(undefined); setDossie(undefined); } }}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>{dossie?.integrante.nome ?? 'Ficha do integrante'}</DialogTitle><DialogDescription>Dossiê individual, documentos, minutas e histórico funcional.</DialogDescription></DialogHeader>
        {busy && !dossie ? <p className="py-10 text-center">Abrindo dossiê…</p> : dossie && <div className="space-y-6">
          <section className="grid gap-3 rounded-md border p-4 sm:grid-cols-3"><Info label="Vínculo" value={dossie.integrante.vinculo} /><Info label="Função" value={dossie.integrante.funcao} /><Info label="Situação" value={dossie.integrante.situacao} /><Info label="CPF/CNPJ" value={dossie.integrante.cpf} /><Info label="Unidade" value={dossie.integrante.unidade_id ? `${dossie.integrante.unidade} (${siglaUnidade(dossie.integrante.unidade_id, unidades)})` : dossie.integrante.unidade} /><Info label="Ingresso" value={dossie.integrante.data_ingresso.split('-').reverse().join('/')} /><Info label="Telefone" value={dossie.integrante.telefone} /><Info label="E-mail" value={dossie.integrante.email} /><Info label="Nascimento" value={dossie.integrante.data_nascimento?.split('-').reverse().join('/')} /></section>
          <section><div className="mb-3 flex flex-wrap items-center gap-2"><h3 className="mr-auto flex items-center gap-2 font-semibold"><Paperclip className="h-4 w-4" />Documentos assinados e anexos</h3><Button size="sm" disabled={busy} onClick={() => fileInput.current?.click()}><Upload className="h-4 w-4" />Anexar</Button><input ref={fileInput} className="hidden" type="file" accept="application/pdf,image/jpeg,image/png" aria-label="Anexar documento do integrante" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void upload(file); }} /></div>
            {!dossie.anexos.length ? <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p> : <ul className="divide-y rounded-md border">{dossie.anexos.map(a => <li key={a.id} className="flex items-center gap-2 p-3"><FileText className="h-4 w-4 shrink-0" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{a.nome}</p><p className="text-xs text-muted-foreground">{(a.tamanho / 1024 / 1024).toFixed(2)} MB</p></div><Button size="icon" variant="outline" aria-label={`Abrir ${a.nome}`} disabled={busy} onClick={async () => { setBusy(true); try { const result = await baixar({ data: { id: a.id } }); window.open(result.url, '_blank', 'noopener'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível abrir.'); } finally { setBusy(false); } }}><Download className="h-4 w-4" /></Button><Button size="icon" variant="outline" aria-label={`Excluir ${a.nome}`} disabled={busy} onClick={async () => { if (!confirm(`Excluir ${a.nome}?`)) return; setBusy(true); try { await excluir({ data: { id: a.id } }); toast.success('Documento excluído.'); await abrir(a.integrante_id); } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível excluir.'); } finally { setBusy(false); } }}><Trash2 className="h-4 w-4" /></Button></li>)}</ul>}
          </section>
          <section><h3 className="mb-3 font-semibold">Minutas geradas</h3>{!dossie.minutas.length ? <p className="text-sm text-muted-foreground">Nenhuma minuta gerada.</p> : <ul className="space-y-2">{dossie.minutas.map(m => <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{m.titulo}</p><p className="text-xs text-muted-foreground">Gerada em {new Date(m.created_at).toLocaleString('pt-BR', { timeZone: 'America/Boa_Vista' })}</p></div><Button size="sm" variant="outline" onClick={() => void gerarMinutaPDF({ titulo: m.titulo, conteudo: m.conteudo, data: m.created_at.slice(0, 10) }).catch(() => toast.error('Não foi possível gerar o PDF.'))}><Download className="h-4 w-4" />PDF</Button></li>)}</ul>}</section>
          <section><h3 className="mb-3 font-semibold">Advertências, processos e ocorrências</h3><div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2"><div><Label htmlFor="occurrence-type">Tipo</Label><select id="occurrence-type" className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm" value={occurrence.tipo} onChange={e => setOccurrence({ ...occurrence, tipo: e.target.value as typeof occurrence.tipo })}><option>Advertência</option><option>Processo</option><option>Ocorrência</option></select></div><div><Label htmlFor="occurrence-date">Data</Label><Input id="occurrence-date" type="date" value={occurrence.ocorridoEm} onChange={e => setOccurrence({ ...occurrence, ocorridoEm: e.target.value })} /></div><div className="sm:col-span-2"><Label htmlFor="occurrence-title">Título</Label><Input id="occurrence-title" maxLength={200} value={occurrence.titulo} onChange={e => setOccurrence({ ...occurrence, titulo: e.target.value })} /></div><div className="sm:col-span-2"><Label htmlFor="occurrence-description">Descrição</Label><Textarea id="occurrence-description" rows={3} value={occurrence.descricao} onChange={e => setOccurrence({ ...occurrence, descricao: e.target.value })} /></div><Button className="sm:col-span-2" disabled={busy || occurrence.titulo.trim().length < 2 || occurrence.descricao.trim().length < 2} onClick={() => void adicionarOcorrencia()}>Registrar no histórico</Button></div>
            {!dossie.ocorrencias.length ? <p className="mt-3 text-sm text-muted-foreground">Nenhum registro no histórico.</p> : <ol className="mt-4 space-y-3 border-l pl-4">{dossie.ocorrencias.map(o => <li key={o.id} className="relative"><span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" /><p className="text-xs text-muted-foreground">{o.tipo} · {o.ocorrido_em.split('-').reverse().join('/')}</p><p className="font-semibold">{o.titulo}</p><p className="whitespace-pre-line text-sm">{o.descricao}</p></li>)}</ol>}
          </section>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}

function Info({ label, value }: { label: string; value?: string | null | undefined }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="break-words text-sm font-medium">{value || 'Não informado'}</p></div>;
}
