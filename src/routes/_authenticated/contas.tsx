import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { toast } from 'sonner';
import { AppHeader, AppFooter } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { listarContas, alterarEmail, alterarSenha, excluirConta, atualizarPermissoes } from '@/lib/contas.functions';

const options = queryOptions({ queryKey: ['contas'], queryFn: () => listarContas() });

export const Route = createFileRoute('/_authenticated/contas')({
  loader: ({ context }) => context.queryClient.ensureQueryData(options),
  head: () => ({ meta: [
    { title: 'Painel de contas — SEII GCM' },
    { name: 'description', content: 'Gestão das contas de acesso ao SEII GCM.' },
    { property: 'og:title', content: 'Painel de contas — SEII GCM' },
    { property: 'og:description', content: 'Gestão das contas de acesso.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Contas,
});

type Conta = Awaited<ReturnType<typeof listarContas>>[number];

const ROTULO: Record<string, string> = { admin: 'Administrador', pedagogica: 'Gestora Pedagógica', administrativa: 'Gestora Administrativa', emissor: 'Painel de emissão' };

function Contas() {
  const { data: contas, refetch } = useSuspenseQuery(options);
  const mudarEmail = useServerFn(alterarEmail);
  const mudarSenha = useServerFn(alterarSenha);
  const excluir = useServerFn(excluirConta);
  const salvarPerms = useServerFn(atualizarPermissoes);
  const [editando, setEditando] = useState<Conta | null>(null);
  const [senhaId, setSenhaId] = useState<string | null>(null);
  const [emailId, setEmailId] = useState<string | null>(null);
  const [valor, setValor] = useState('');
  const [perms, setPerms] = useState({ tipo_painel: 'individual' as 'individual'|'setor', setor: '', responsavel: '', nome: '', funcao: '', pode_emitir: false, pode_assinar: false, pode_comentar: false, ativo: true });
  const [busy, setBusy] = useState(false);

  function abrirPerms(c: Conta) {
    setEditando(c);
    setPerms({ tipo_painel: c.painel?.tipo_painel === 'setor' ? 'setor' : 'individual', setor: c.painel?.setor ?? '', responsavel: c.painel?.responsavel ?? '', nome: c.painel?.nome ?? '', funcao: c.painel?.funcao ?? '', pode_emitir: c.painel?.pode_emitir ?? false, pode_assinar: c.painel?.pode_assinar ?? false, pode_comentar: c.painel?.pode_comentar ?? false, ativo: c.painel?.ativo ?? true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-primary">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold text-primary-foreground">Painel de contas</h1>
        <p className="text-primary-foreground/80">{contas.length} conta(s) com acesso ao sistema.</p>
        <ul className="space-y-3">
          {contas.map(c => (
            <li key={c.id} className="space-y-3 rounded-lg bg-card p-4 text-card-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <div className="mr-auto min-w-0">
                  <p className="truncate font-bold">{c.painel?.nome ?? c.email}</p>
                  <p className="truncate text-sm text-muted-foreground">{c.email} · {ROTULO[c.role] ?? c.role}{c.painel ? ` · ${c.painel.funcao}` : ''}</p>
                  {c.painel && <p className="text-xs text-muted-foreground">{c.painel.ativo ? 'Ativa' : 'Desativada'} · {c.painel.pode_emitir ? 'Emite' : 'Não emite'} · {c.painel.pode_assinar ? 'Assina' : 'Não assina'} · {c.painel.pode_comentar ? 'Comenta' : 'Não comenta'}</p>}
                </div>
                <Button size="sm" variant="outline" onClick={() => { setEmailId(c.id); setValor(c.email); }}>Alterar e-mail</Button>
                <Button size="sm" variant="outline" onClick={() => { setSenhaId(c.id); setValor(''); }}>Alterar senha</Button>
                <Button size="sm" variant="outline" onClick={() => abrirPerms(c)}>Editar permissão</Button>
                <Button size="sm" variant="destructive" onClick={async () => { if (!confirm(`Excluir a conta ${c.email}?`)) return; try { await excluir({ data: { id: c.id } }); toast.success('Conta excluída'); refetch(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao excluir.'); } }}>Excluir</Button>
              </div>
            </li>
          ))}
        </ul>
      </main>
      <AppFooter />

      <Dialog open={!!emailId} onOpenChange={o => !o && setEmailId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar e-mail</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="novo-email">Novo e-mail</Label><Input id="novo-email" type="email" value={valor} onChange={e => setValor(e.target.value)} /></div>
            <Button disabled={busy} className="w-full" onClick={async () => { if (!emailId) return; setBusy(true); try { await mudarEmail({ data: { id: emailId, email: valor } }); toast.success('E-mail alterado'); setEmailId(null); refetch(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro.'); } finally { setBusy(false); } }}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!senhaId} onOpenChange={o => !o && setSenhaId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar senha</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="nova-senha">Nova senha (mín. 8)</Label><Input id="nova-senha" type="password" minLength={8} value={valor} onChange={e => setValor(e.target.value)} /></div>
            <Button disabled={busy || valor.length < 8} className="w-full" onClick={async () => { if (!senhaId) return; setBusy(true); try { await mudarSenha({ data: { id: senhaId, password: valor } }); toast.success('Senha alterada. Entregue a nova senha ao titular.'); setSenhaId(null); } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro.'); } finally { setBusy(false); } }}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editando} onOpenChange={o => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar permissão — {editando?.painel?.nome ?? editando?.email}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tipo de painel</Label><select aria-label="Tipo de painel" className="h-9 w-full rounded-md border bg-card px-2" value={perms.tipo_painel} onChange={e=>setPerms({...perms,tipo_painel:e.target.value === "setor" ? "setor" : "individual"})}><option value="individual">Emissão única — pessoa</option><option value="setor">Órgão / setor</option></select></div>{perms.tipo_painel === "setor" && <><Label>Nome do setor</Label><Input aria-label="Nome do setor" value={perms.setor} onChange={e=>setPerms({...perms,setor:e.target.value,nome:e.target.value})}/><Label>Responsável (opcional)</Label><Input value={perms.responsavel} onChange={e=>setPerms({...perms,responsavel:e.target.value})}/></>}<div><Label htmlFor="perm-nome">Nome completo</Label><Input id="perm-nome" value={perms.nome} onChange={e => setPerms({ ...perms, nome: e.target.value })} /></div>
            <div><Label htmlFor="perm-funcao">Função</Label><Input id="perm-funcao" value={perms.funcao} onChange={e => setPerms({ ...perms, funcao: e.target.value })} /></div>
            {([['pode_emitir', 'Pode emitir docs'], ['pode_assinar', 'Pode enviar solicitações de assinatura'], ['pode_comentar', 'Pode comentar nos docs'], ['ativo', 'Conta ativa (desmarque para bloquear o acesso)']] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <Checkbox checked={perms[k]} onCheckedChange={v => setPerms({ ...perms, [k]: v === true })} /> {l}
              </label>
            ))}
            <p className="text-xs text-muted-foreground">Desmarcando emissão, assinatura e comentários, a conta fica somente de visualização.</p>
            <Button disabled={busy} className="w-full" onClick={async () => { if (!editando) return; setBusy(true); try { await salvarPerms({ data: { id: editando.id, ...perms } }); toast.success('Permissões salvas'); setEditando(null); refetch(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro.'); } finally { setBusy(false); } }}>Salvar permissões</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
