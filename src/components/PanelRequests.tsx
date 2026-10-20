import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { destinatarios, enviarSolicitacao } from '@/lib/setor.functions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export function PanelRequests() {
  const list = useServerFn(destinatarios); const send = useServerFn(enviarSolicitacao);
  const [people, setPeople] = useState<{ id: string; nome: string }[]>([]);
  const [rows, setRows] = useState<{ id: string; destinatario: string; texto: string; assinante_nome: string }[]>([]);
  const [search, setSearch] = useState(''); const [destino, setDestino] = useState(''); const [texto, setTexto] = useState('');
  const [nome, setNome] = useState(''); const [funcao, setFuncao] = useState(''); const [checked, setChecked] = useState(false); const [busy, setBusy] = useState(false);
  const load = () => supabase.from('solicitacoes_internas').select('id,destinatario,texto,assinante_nome').order('assinado_em', { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { list().then(setPeople).catch(() => toast.error('Não foi possível listar destinatários.')); void load(); const timer=window.setInterval(load,15_000);window.addEventListener('focus',load);return()=>{window.clearInterval(timer);window.removeEventListener('focus',load);}; }, []);
  return <section className="space-y-3 border-t border-primary-foreground/30 pt-5 text-primary-foreground"><h2 className="text-lg font-bold">Solicitações</h2>
    <form className="space-y-3" onSubmit={async e => { e.preventDefault(); setBusy(true); try { await send({ data: { destino, texto, nome, funcao, concordo: true } }); setTexto(''); setChecked(false); await load(); toast.success('Solicitação enviada'); } catch(e) { toast.error(e instanceof Error ? e.message : 'Falha ao enviar.'); } finally { setBusy(false); } }}>
      <Input className="bg-card text-card-foreground" aria-label="Para quem enviar?" placeholder="Pesquisar setor ou pessoa" value={search} onChange={e => { setSearch(e.target.value); setDestino(''); }}/>
      {search && !destino && <div className="flex flex-wrap gap-2">{people.filter(p => p.nome.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).map(p => <Button variant="secondary" key={p.id} type="button" onClick={() => { setDestino(p.id); setSearch(p.nome); }}>{p.nome}</Button>)}</div>}
      <Textarea className="bg-card text-card-foreground" aria-label="Texto da solicitação" placeholder="Texto" required maxLength={5000} value={texto} onChange={e => setTexto(e.target.value)}/>
      <Input className="bg-card text-card-foreground" aria-label="Nome do solicitante" placeholder="Nome completo" required value={nome} onChange={e => setNome(e.target.value)}/><Input className="bg-card text-card-foreground" aria-label="Função do solicitante" placeholder="Função" required value={funcao} onChange={e => setFuncao(e.target.value)}/>
      <label className="flex items-center gap-2"><Checkbox checked={checked} onCheckedChange={v => setChecked(v === true)}/>Assinar solicitação</label><Button variant="secondary" disabled={!destino || !checked || busy}>{busy ? 'Enviando…' : 'Assinar e enviar solicitação'}</Button>
    </form>
    {rows.map(r => <article key={r.id} className="rounded-md bg-card p-4 text-card-foreground"><p className="font-bold">{r.assinante_nome} → {r.destinatario}</p><p className="whitespace-pre-line">{r.texto}</p></article>)}
  </section>;
}