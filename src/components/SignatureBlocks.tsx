import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Layers, PenLine, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { signBlock } from '@/lib/blocos.functions';
import { blocoValido, type BlockItem } from '@/lib/signature-block';
import { identificacaoDocumento, type Documento } from '@/lib/documento';
import { gestoraDaConta } from '@/lib/signature-identity';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { DocumentViewer } from './DocumentViewer';

type Block = { id: string; nome: string; itens: unknown; assinado_em: string | null };
export function SignatureBlocks({ onSigned }: { onSigned?: () => void }) {
  const sign = useServerFn(signBlock);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [candidates, setCandidates] = useState<BlockItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [create, setCreate] = useState(false);
  const [name, setName] = useState('');
  const [active, setActive] = useState<Block | null>(null);
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [manual, setManual] = useState(false);
  const [signName, setSignName] = useState('');
  const [role, setRole] = useState('');
  const [cpf, setCpf] = useState('');
  const [decision, setDecision] = useState<'deferido' | 'indeferido'>('deferido');
  const [busy, setBusy] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [view, setView] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const key = (item: BlockItem) => `${item.documento_id}:${item.modo}:${item.solicitacao_id ?? ''}`;
  async function load() {
    const { data: auth } = await supabase.auth.getUser(); const uid = auth.user?.id; if (!uid) return;
    const [{ data: permission }, { data: panel }, { data: roles }, { data: docs, error: docError }, { data: requests }, { data: list, error: blockError }] = await Promise.all([
      supabase.rpc('permissao_painel', { _uid: uid, _acao: 'assinar' }),
      supabase.from('paineis').select('tipo_painel').eq('user_id', uid).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', uid),
      supabase.from('documentos').select('id,dados,versao,criado_por'),
      supabase.from('solicitacoes_assinatura').select('id,documento_id,versao,gestora,assinado_em'),
      supabase.from('blocos_assinatura').select('id,nome,itens,assinado_em').order('created_at', { ascending: false }),
    ]);
    setAllowed(!!permission); setManual(panel?.tipo_painel === 'setor' && !gestoraDaConta('', (roles ?? []).map(r => r.role)));
    setError(!!docError || !!blockError); setBlocks(list ?? []);
    const targets = new Set([`user:${uid}`, ...(roles ?? []).map(r => r.role)]);
    const items: BlockItem[] = [];
    for (const doc of docs ?? []) {
      const data = doc.dados as unknown as Documento;
      const titulo = `${identificacaoDocumento(data)}${data.assunto ? ` — ${data.assunto}` : ''}`;
      const current = (requests ?? []).filter(r => r.documento_id === doc.id && r.versao === doc.versao);
      if (doc.criado_por === uid && !current.some(r => r.gestora === `emissor:${uid}` && r.assinado_em)) items.push({ documento_id: doc.id, versao: doc.versao, modo: 'autor', titulo });
      for (const req of current.filter(r => !r.assinado_em && targets.has(r.gestora))) items.push({ documento_id: doc.id, versao: doc.versao, modo: 'solicitacao', solicitacao_id: req.id, titulo });
    }
    setCandidates(items);
  }
  useEffect(() => { void load(); }, []);
  if (!allowed && !error) return null;
  return <section className="space-y-3 border-y border-primary-foreground/30 py-4 text-primary-foreground">
    <div className="flex flex-wrap items-center gap-2"><Layers className="size-5" /><h2 className="mr-auto font-bold">Blocos de assinatura</h2><Button size="sm" variant="secondary" disabled={!allowed} onClick={() => { setSelected([]); setName(''); setCreate(true); void load(); }}><Plus className="size-4" />Novo bloco</Button></div>
    {error ? <Button variant="outline" onClick={load}>Tentar novamente</Button> : !blocks.length ? <p className="text-sm">Nenhum bloco criado.</p> : blocks.map(block => <div key={block.id} className="flex flex-wrap items-center gap-2 rounded-md bg-card p-3 text-card-foreground"><div className="mr-auto min-w-0"><p className="break-words font-semibold">{block.nome}</p><p className="text-xs text-muted-foreground">{(block.itens as BlockItem[]).length} documentos · {block.assinado_em ? 'Assinado' : 'Aguardando assinatura'}</p></div><Button size="sm" variant="outline" onClick={() => { setActive(block); setConsent(false); setPassword(''); }}> {block.assinado_em ? 'Ver bloco' : <><PenLine className="size-4" />Revisar e assinar</>}</Button>{!block.assinado_em && <Button size="icon" variant="outline" aria-label={`Excluir bloco ${block.nome}`} onClick={async () => { if (!confirm('Excluir somente o bloco? Os documentos serão mantidos.')) return; const { error } = await supabase.from('blocos_assinatura').delete().eq('id', block.id); if (error) toast.error('Não foi possível excluir.'); else await load(); }}><Trash2 className="size-4" /></Button>}</div>)}
    <Dialog open={create} onOpenChange={o => !busy && setCreate(o)}><DialogContent className="max-h-[85svh] overflow-y-auto"><DialogHeader><DialogTitle>Novo bloco de assinatura</DialogTitle></DialogHeader><Input aria-label="Nome do bloco" placeholder="Nome do bloco" maxLength={120} value={name} onChange={e => setName(e.target.value)} /><div className="space-y-3">{!candidates.length && <p>Nenhum documento disponível para sua assinatura.</p>}{candidates.map(item => <label key={key(item)} className="flex items-start gap-2 text-sm"><Checkbox aria-label={`Selecionar ${item.titulo}`} checked={selected.includes(key(item))} onCheckedChange={on => setSelected(current => on === true ? [...current, key(item)] : current.filter(k => k !== key(item)))} /><span className="min-w-0 break-words">{item.titulo}<span className="block text-xs text-muted-foreground">Versão {item.versao} · {item.modo === 'autor' ? 'Assinatura do emissor' : 'Solicitação recebida'}</span></span></label>)}</div><Button disabled={busy || !name.trim() || !blocoValido(candidates.filter(i => selected.includes(key(i))))} onClick={async () => { setBusy(true); try { const itens = candidates.filter(i => selected.includes(key(i))); const { error } = await supabase.from('blocos_assinatura').insert({ nome: name.trim(), itens: itens as never }); if (error) throw error; setCreate(false); await load(); toast.success('Bloco criado.'); } catch { toast.error('Não foi possível criar o bloco.'); } finally { setBusy(false); } }}>Criar bloco ({selected.length})</Button></DialogContent></Dialog>
    <Dialog open={!!active} onOpenChange={o => { if (!o && !busy) { setActive(null); setPassword(''); } }}><DialogContent className="max-h-[85svh] overflow-y-auto"><DialogHeader><DialogTitle>{active?.nome}</DialogTitle></DialogHeader>
      {(active?.itens as BlockItem[] | undefined)?.map((item, i) => <div key={i} className="flex items-center gap-2 border-b pb-2"><span className="mr-auto min-w-0 break-words text-sm">{item.titulo} · v{item.versao}</span><Button size="sm" variant="outline" onClick={() => setView(item.documento_id)}>Ler</Button></div>)}
      {!active?.assinado_em && <form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (!active || !consent) return; setBusy(true); try { const result = await sign({ data: { id: active.id, password, nome: signName, funcao: role, cpf, concordo: true, decisao: decision } }); toast.success(`${result.count} documentos assinados.`); setActive(null); setPassword(''); await load(); onSigned?.(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível assinar.'); } finally { setBusy(false); } }}>
        {(active?.itens as BlockItem[] | undefined)?.some(i => i.modo === 'solicitacao') && <label className="block space-y-1 text-sm">Decisão para pedidos de deferimento<select aria-label="Decisão do bloco" className="h-9 w-full rounded-md border bg-card px-2" value={decision} onChange={e => setDecision(e.target.value === 'indeferido' ? 'indeferido' : 'deferido')}><option value="deferido">Deferido</option><option value="indeferido">Indeferido</option></select></label>}
        {manual && <><Input aria-label="Nome completo no bloco" placeholder="Nome completo" required value={signName} onChange={e => setSignName(e.target.value)} /><Input aria-label="Função no bloco" placeholder="Função" required value={role} onChange={e => setRole(e.target.value)} /><Input aria-label="CPF no bloco" placeholder="CPF" required value={cpf} onChange={e => setCpf(e.target.value)} /></>}
        <Input type="password" aria-label="Senha para assinar bloco" placeholder="Senha da conta" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /><label className="flex items-start gap-2 text-sm"><Checkbox checked={consent} onCheckedChange={v => setConsent(v === true)} />Li todos os documentos deste bloco e confirmo suas assinaturas.</label><Button type="submit" disabled={busy || !password || !consent}>{busy ? 'Assinando…' : 'Assinar bloco'}</Button>
      </form>}
    </DialogContent></Dialog><DocumentViewer id={view} recebido onClose={() => setView(null)} />
  </section>;
}
