import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Building2, Pencil, Plus, Users, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader, AppFooter } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRequireSession } from '@/hooks/use-session';
import { descendentesUnidade, ordenarUnidadesHierarquia, siglaUnidade, unidadePermite, type Unidade } from '@/lib/unidades';
import { listarGestaoUnidades, salvarUnidade, vincularContaUnidade, vincularIntegranteUnidade } from '@/lib/unidades.functions';

export const Route = createFileRoute('/_authenticated/unidades')({
  head: () => ({ meta: [
    { title: 'Gestão de unidades — SEII GCM' },
    { name: 'description', content: 'Cadastro de unidades, subunidades e vínculos de contas e integrantes do CEM XXXIII.' },
    { property: 'og:title', content: 'Gestão de unidades — SEII GCM' },
    { property: 'og:description', content: 'Hierarquia de unidades, controles de emissão e recebimento no SEII.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: UnidadesPage,
});

type DadosGestao = Awaited<ReturnType<typeof listarGestaoUnidades>>;
type FormUnidade = { id?: string; nome: string; sigla: string; pai_id: string | null; ativa: boolean; pode_emitir: boolean; pode_receber: boolean };
const FORM_INICIAL: FormUnidade = { nome: '', sigla: '', pai_id: null, ativa: true, pode_emitir: true, pode_receber: true };

function UnidadesPage() {
  const { ready, isAdmin } = useRequireSession(false);
  const carregarFn = useServerFn(listarGestaoUnidades);
  const salvarFn = useServerFn(salvarUnidade);
  const vincularContaFn = useServerFn(vincularContaUnidade);
  const vincularIntegranteFn = useServerFn(vincularIntegranteUnidade);

  const [dados, setDados] = useState<DadosGestao>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<FormUnidade>(FORM_INICIAL);
  const [vinculoUnidade, setVinculoUnidade] = useState<Unidade | null>(null);

  async function carregar() {
    setLoading(true);
    try { setDados(await carregarFn()); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível carregar as unidades.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (ready && isAdmin) void carregar(); }, [ready, isAdmin]);

  const unidades = dados?.unidades ?? [];
  const arvore = useMemo(() => ordenarUnidadesHierarquia(unidades), [unidades]);
  const bloqueadosPai = useMemo(() => form.id ? descendentesUnidade(form.id, unidades) : new Set<string>(), [form.id, unidades]);
  const previaSigla = useMemo(() => {
    const limpa = form.sigla.trim().toUpperCase();
    if (!limpa) return 'CEMXXXIII/...';
    return form.pai_id ? `${siglaUnidade(form.pai_id, unidades)}/${limpa}` : `CEMXXXIII/${limpa}`;
  }, [form.sigla, form.pai_id, unidades]);

  function abrirNova(paiId: string | null = null) {
    setForm({ ...FORM_INICIAL, pai_id: paiId });
    setModalAberto(true);
  }

  function abrirEdicao(u: Unidade) {
    setForm({ id: u.id, nome: u.nome, sigla: u.sigla, pai_id: u.pai_id, ativa: u.ativa, pode_emitir: u.pode_emitir, pode_receber: u.pode_receber });
    setModalAberto(true);
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await salvarFn({ data: { ...(form.id ? { id: form.id } : {}), nome: form.nome, sigla: form.sigla.toUpperCase(), pai_id: form.pai_id, ativa: form.ativa, pode_emitir: form.pode_emitir, pode_receber: form.pode_receber } });
      toast.success(form.id ? 'Unidade atualizada.' : 'Unidade cadastrada.');
      setModalAberto(false);
      await carregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar a unidade.');
    } finally { setBusy(false); }
  }

  async function alternarConta(userId: string, unidadeId: string | null) {
    setBusy(true);
    try {
      await vincularContaFn({ data: { userId, unidadeId } });
      toast.success(unidadeId ? 'Conta vinculada à unidade.' : 'Vínculo da conta removido.');
      await carregar();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro ao atualizar vínculo.'); }
    finally { setBusy(false); }
  }

  async function alternarIntegrante(integranteId: string, unidadeId: string | null) {
    setBusy(true);
    try {
      await vincularIntegranteFn({ data: { integranteId, unidadeId } });
      toast.success(unidadeId ? 'Integrante vinculado à unidade.' : 'Vínculo do integrante removido.');
      await carregar();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro ao atualizar vínculo.'); }
    finally { setBusy(false); }
  }

  if (!ready) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="text-2xl font-bold text-foreground">Gestão de unidades</h1>
            <p className="mt-1 text-sm text-foreground/75">Organize unidades, subunidades, controles de emissão/recebimento e vínculos de contas e integrantes.</p>
          </div>
          {isAdmin && <Button onClick={() => abrirNova(null)}><Plus className="h-4 w-4" />Nova unidade</Button>}
        </div>

        {!isAdmin ? (
          <section className="rounded-lg border bg-card p-6 text-card-foreground">
            <h2 className="font-semibold">Acesso restrito</h2>
            <p className="mt-2 text-sm text-muted-foreground">A gestão de unidades está disponível somente para o administrador.</p>
          </section>
        ) : loading ? (
          <p className="py-10 text-center text-muted-foreground">Carregando unidades…</p>
        ) : !arvore.length ? (
          <section className="rounded-lg border bg-card p-8 text-center text-card-foreground">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">Nenhuma unidade cadastrada.</p>
            <p className="mt-1 text-sm text-muted-foreground">Crie a primeira unidade para estruturar siglas, contas e integrantes.</p>
            <Button className="mt-4" onClick={() => abrirNova(null)}><Plus className="h-4 w-4" />Criar primeira unidade</Button>
          </section>
        ) : (
          <ul className="space-y-3">
            {arvore.map(({ unidade: u, nivel, siglaCompleta }) => {
              const contasDaUnidade = (dados?.contas ?? []).filter(c => c.unidade_id === u.id);
              const integrantesDaUnidade = (dados?.integrantes ?? []).filter(i => i.unidade_id === u.id);
              const emiteEfetivo = unidadePermite(u.id, unidades, 'emitir');
              const recebeEfetivo = unidadePermite(u.id, unidades, 'receber');
              return (
                <li key={u.id} style={{ marginLeft: `${Math.min(nivel, 4) * 20}px` }} className="rounded-lg border bg-card p-4 text-card-foreground">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">{u.nome}</p>
                        <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{siglaCompleta}</span>
                        {!u.ativa && <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">Inativa</span>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {emiteEfetivo ? 'Emissão liberada' : 'Emissão bloqueada'} · {recebeEfetivo ? 'Recebimento liberado' : 'Recebimento bloqueado'} · {contasDaUnidade.length} conta(s) · {integrantesDaUnidade.length} integrante(s)
                      </p>
                      {u.ativa && ((!emiteEfetivo && u.pode_emitir) || (!recebeEfetivo && u.pode_receber)) && (
                        <p className="mt-1 text-xs text-destructive">Restrição herdada de uma unidade superior.</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => abrirNova(u.id)}><Plus className="h-3.5 w-3.5" />Subunidade</Button>
                      <Button size="sm" variant="outline" onClick={() => setVinculoUnidade(u)}><Users className="h-3.5 w-3.5" />Vínculos</Button>
                      <Button size="sm" variant="outline" onClick={() => abrirEdicao(u)}><Pencil className="h-3.5 w-3.5" />Editar</Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <AppFooter />

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar unidade' : 'Nova unidade'}</DialogTitle>
            <DialogDescription>Defina nome, sigla hierárquica e permissões de tramitação.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={e => void handleSalvar(e)}>
            <div><Label htmlFor="u-nome">Nome da unidade</Label><Input id="u-nome" required minLength={3} maxLength={200} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Coordenação de Comunicação e Mídia" /></div>
            <div>
              <Label htmlFor="u-sigla">Sigla (2 a 20 letras/números)</Label>
              <Input id="u-sigla" required minLength={2} maxLength={20} value={form.sigla} onChange={e => setForm({ ...form, sigla: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} placeholder="Ex.: CCM" />
              <p className="mt-1 text-xs text-muted-foreground">Identificação gerada: <span className="font-mono font-medium">{previaSigla}</span></p>
            </div>
            <div>
              <Label htmlFor="u-pai">Unidade superior (opcional)</Label>
              <select id="u-pai" className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm" value={form.pai_id ?? ''} onChange={e => setForm({ ...form, pai_id: e.target.value || null })}>
                <option value="">Nenhuma (unidade principal)</option>
                {arvore.filter(item => !bloqueadosPai.has(item.unidade.id)).map(item => (
                  <option key={item.unidade.id} value={item.unidade.id}>{item.unidade.nome} ({item.siglaCompleta})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 border-t pt-3">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.ativa} onCheckedChange={v => setForm({ ...form, ativa: v === true })} />Unidade ativa</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.pode_emitir} onCheckedChange={v => setForm({ ...form, pode_emitir: v === true })} />Pode emitir documentos</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.pode_receber} onCheckedChange={v => setForm({ ...form, pode_receber: v === true })} />Pode receber documentos e solicitações</label>
            </div>
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Salvando…' : form.id ? 'Salvar alterações' : 'Cadastrar unidade'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!vinculoUnidade} onOpenChange={open => !open && setVinculoUnidade(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vínculos — {vinculoUnidade?.nome}</DialogTitle>
            <DialogDescription>Associe contas de acesso e integrantes cadastrados a esta unidade.</DialogDescription>
          </DialogHeader>
          {vinculoUnidade && dados && (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><UserCheck className="h-4 w-4" />Contas de acesso</h3>
                {!dados.contas.length ? <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p> : (
                  <ul className="divide-y rounded-md border">
                    {dados.contas.map(c => {
                      const vinculada = c.unidade_id === vinculoUnidade.id;
                      const outra = c.unidade_id && !vinculada ? siglaUnidade(c.unidade_id, unidades) : null;
                      return (
                        <li key={c.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{c.nome}</p>
                            <p className="truncate text-xs text-muted-foreground">{c.email}{outra ? ` · Atual: ${outra}` : ''}</p>
                          </div>
                          <Button size="sm" variant={vinculada ? 'destructive' : 'outline'} disabled={busy} onClick={() => void alternarConta(c.id, vinculada ? null : vinculoUnidade.id)}>
                            {vinculada ? 'Desvincular' : 'Vincular'}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" />Integrantes cadastrados</h3>
                {!dados.integrantes.length ? <p className="text-sm text-muted-foreground">Nenhum integrante cadastrado.</p> : (
                  <ul className="divide-y rounded-md border">
                    {dados.integrantes.map(i => {
                      const vinculado = i.unidade_id === vinculoUnidade.id;
                      const outra = i.unidade_id && !vinculado ? siglaUnidade(i.unidade_id, unidades) : null;
                      return (
                        <li key={i.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{i.nome}</p>
                            <p className="truncate text-xs text-muted-foreground">{i.funcao || i.situacao}{outra ? ` · Atual: ${outra}` : ''}</p>
                          </div>
                          <Button size="sm" variant={vinculado ? 'destructive' : 'outline'} disabled={busy} onClick={() => void alternarIntegrante(i.id, vinculado ? null : vinculoUnidade.id)}>
                            {vinculado ? 'Desvincular' : 'Vincular'}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}