import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getPainel, criarGestora, getAssignedRequest } from '@/lib/painel.functions';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';
const options = queryOptions({queryKey:['painel'],queryFn:()=>getPainel()});
export const Route = createFileRoute('/_authenticated/painel')({
  loader:({context})=>context.queryClient.ensureQueryData(options),
  head:()=>({meta:[{title:'Painel de aprovação — CCM'},{name:'description',content:'Aprovações, prazos e acessos individuais do CEM XXXIII.'},{property:'og:title',content:'Painel de aprovação — CCM'},{property:'og:description',content:'Aprovações e acessos individuais do CCM.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
  component:Painel,
});
function Painel(){
  const {data,refetch}=useSuspenseQuery(options); const navigate=useNavigate(); const criar=useServerFn(criarGestora); const abrir=useServerFn(getAssignedRequest);
  const [email,setEmail]=useState('');const [pw,setPw]=useState('');const [role,setRole]=useState<'pedagogica'|'administrativa'>('pedagogica');const [funcao,setFuncao]=useState('');const [busy,setBusy]=useState(false);
  const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Boa_Vista',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  async function adicionarFuncao(){const {error}=await supabase.from('funcoes_predefinidas').insert({nome:funcao.trim()});if(error)toast.error('Não foi possível salvar a função.');else{setFuncao('');refetch();}}
  return <div className="min-h-screen"><AppHeader/><main className="mx-auto max-w-4xl space-y-6 px-4 py-8"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-primary-foreground">{data.admin?'Administração':'Meus documentos'}</h1><Button variant="outline" onClick={()=>refetch()}>Atualizar</Button></div>
  {!data.admin && <><h2 className="font-bold text-primary-foreground">Aguardando aprovação</h2>{data.docs.filter(d=>data.requests.some(r=>r.documento_id===d.id&&!r.assinado_em)).map(d=><article key={d.id} className="space-y-2 rounded-lg border bg-card p-4 text-card-foreground"><p className="font-bold">{d.tipo} Nº {String(d.numero).padStart(3,'0')}/{d.ano}</p><p>{d.assunto}</p><p className={d.prazo&&d.prazo<hoje?'font-semibold text-destructive':'text-muted-foreground'}>{d.prioridade==='alta'?'Prioridade alta':'Prioridade normal'} · {d.prazo?`Prazo: ${d.prazo.split('-').reverse().join('/')}${d.prazo<hoje?' · Atrasado':''}`:'Sem prazo'}</p>{data.requests.filter(r=>r.documento_id===d.id&&!r.assinado_em).map(r=><Button key={r.id} onClick={async()=>{try{const s=await abrir({data:{id:r.id}});navigate({to:'/assinar/$token',params:{token:s.token}});}catch{toast.error('Não foi possível abrir.');}}}>Ler e assinar</Button>)}</article>)}
  {!data.requests.some(r=>!r.assinado_em)&&<p className="text-primary-foreground">Nenhum documento pendente.</p>}<h2 className="font-bold text-primary-foreground">Assinados por mim</h2>{data.docs.filter(d=>data.requests.some(r=>r.documento_id===d.id&&r.assinado_em)).map(d=><p key={d.id} className="rounded-lg bg-card p-4 text-card-foreground">{d.tipo} Nº {d.numero}/{d.ano} · {d.assunto}</p>)}</>}
  {data.admin&&<><section className="space-y-4 border-t border-primary-foreground/30 pt-4 text-primary-foreground"><h2 className="text-lg font-bold">Acesso individual das gestoras</h2><form className="grid gap-3 sm:grid-cols-2" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await criar({data:{email,password:pw,role}});toast.success('Acesso criado. Entregue o e-mail e a senha à gestora.');setEmail('');setPw('');}catch(e){toast.error(e instanceof Error?e.message:'Erro ao criar acesso.');}finally{setBusy(false);}}}><div><Label>Gestora</Label><Select value={role} onValueChange={v=>setRole(v as typeof role)}><SelectTrigger className="bg-card text-card-foreground"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="pedagogica">Pedagógica</SelectItem><SelectItem value="administrativa">Administrativa</SelectItem></SelectContent></Select></div><div><Label htmlFor="gestora-email">E-mail</Label><Input id="gestora-email" className="bg-card text-card-foreground" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div><div><Label htmlFor="gestora-pw">Senha inicial</Label><Input id="gestora-pw" className="bg-card text-card-foreground" type="password" minLength={8} required value={pw} onChange={e=>setPw(e.target.value)}/></div><Button disabled={busy} type="submit">{busy?'Aguarde...':'Criar acesso'}</Button></form></section>
  <section className="space-y-3 border-t border-primary-foreground/30 pt-4 text-primary-foreground"><h2 className="text-lg font-bold">Funções para assinatura</h2><form className="flex gap-2" onSubmit={e=>{e.preventDefault();adicionarFuncao();}}><Input aria-label="Nova função" className="bg-card text-card-foreground" required maxLength={200} value={funcao} onChange={e=>setFuncao(e.target.value)}/><Button type="submit">Adicionar</Button></form>{data.funcoes.map(f=><div key={f.id} className="flex items-center justify-between gap-2"><span>{f.nome}</span><Button variant="outline" size="sm" onClick={async()=>{const {error}=await supabase.from('funcoes_predefinidas').delete().eq('id',f.id);if(error)toast.error('Não foi possível excluir.');else refetch();}}>Remover</Button></div>)}</section></>}
  </main></div>;
}
