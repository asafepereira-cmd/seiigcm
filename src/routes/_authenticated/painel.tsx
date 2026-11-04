import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getPainel, getAssignedRequest } from '@/lib/painel.functions';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { lerAssinaturaPng } from '@/lib/assinatura';
import { toast } from 'sonner';
import { DocumentViewer } from '@/components/DocumentViewer';
import { DocumentNotifications } from '@/components/DocumentNotifications';
import { SectorCollaborators } from "@/components/SectorCollaborators";
const options = queryOptions({queryKey:['painel'],queryFn:()=>getPainel(),refetchInterval:15_000,refetchOnWindowFocus:'always',refetchOnReconnect:'always'});
export const Route = createFileRoute('/_authenticated/painel')({
  loader:({context})=>context.queryClient.ensureQueryData(options),
  head:()=>({meta:[{title:'Painel de aprovação — CCM'},{name:'description',content:'Aprovações, prazos e acessos individuais do CEM XXXIII.'},{property:'og:title',content:'Painel de aprovação — CCM'},{property:'og:description',content:'Aprovações e acessos individuais do CCM.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
  component:Painel,
});
function Painel(){
  const {data,refetch}=useSuspenseQuery(options); const navigate=useNavigate();  const abrir=useServerFn(getAssignedRequest);
  const [view,setView]=useState<string|null>(null);
  const [banco,setBanco]=useState<Record<string,string>>({});
  const carregarBanco=()=>supabase.from('assinaturas_gestoras').select('gestora,imagem').then(({data:b})=>setBanco(Object.fromEntries((b??[]).map(i=>[i.gestora,i.imagem]))));
  useEffect(()=>{if(data.admin)carregarBanco();},[data.admin]);
  async function salvarImagem(gestora:string,file?:File){if(!file)return;try{const imagem=await lerAssinaturaPng(file);const {error}=await supabase.from('assinaturas_gestoras').upsert({gestora,imagem,updated_at:new Date().toISOString()});if(error)throw error;toast.success('Assinatura salva');carregarBanco();}catch{toast.error('Envie uma imagem PNG válida.');}}
  function verImagem(src:string){const w=window.open();if(w)w.document.write(`<img src="${src}" style="max-width:100%">`);}const [funcao,setFuncao]=useState('');const [busy,setBusy]=useState(false);
  const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Boa_Vista',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  async function adicionarFuncao(){const {error}=await supabase.from('funcoes_predefinidas').insert({nome:funcao.trim()});if(error)toast.error('Não foi possível salvar a função.');else{setFuncao('');refetch();}}
  return <div className="min-h-screen"><AppHeader/><main className="mx-auto max-w-4xl space-y-6 px-4 py-8"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-primary-foreground">{data.admin?'Administração':'Meus documentos'}</h1><Button variant="outline" onClick={()=>refetch()}>Atualizar</Button></div>
  {<><h2 className="font-bold text-primary-foreground">{data.admin?'Recebidos para minha assinatura':'Aguardando aprovação'}</h2>{data.docs.filter(d=>data.minhas.some(r=>r.documento_id===d.id&&!r.assinado_em)).map(d=><article key={d.id} className="space-y-2 rounded-lg border bg-card p-4 text-card-foreground"><p className="font-bold">{d.tipo} Nº {String(d.numero).padStart(3,'0')}/{d.ano}</p><p>{d.assunto}</p><p className={d.prazo&&d.prazo<hoje?'font-semibold text-destructive':'text-muted-foreground'}>{d.prioridade==='alta'?'Prioridade alta':'Prioridade normal'} · {d.prazo?`Prazo: ${d.prazo.split('-').reverse().join('/')}${d.prazo<hoje?' · Atrasado':''}`:'Sem prazo'}</p>{data.minhas.filter(r=>r.documento_id===d.id&&!r.assinado_em).map(r=><div key={r.id} className="flex flex-wrap items-center gap-2"><Button variant="outline" onClick={async()=>{const {error}=await supabase.rpc('marcar_analise',{_id:r.id});if(error)toast.error('Não foi possível registrar a análise.');else refetch();}}>{r.em_analise_em?'Em análise':'Marcar em análise'}</Button><Button onClick={async()=>{try{const s=await abrir({data:{id:r.id}});navigate({to:'/assinar/$token',params:{token:s.token}});}catch{toast.error('Não foi possível abrir.');}}}>Ler e assinar</Button></div>)}</article>)}
  {!data.requests.some(r=>!r.assinado_em)&&<p className="text-primary-foreground">Nenhum documento pendente.</p>}<h2 className="font-bold text-primary-foreground">Assinados por mim</h2>{data.docs.filter(d=>data.requests.some(r=>r.documento_id===d.id&&r.assinado_em)).map(d=><div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-card p-4 text-card-foreground"><span className="mr-auto">{d.tipo} Nº {d.numero}/{d.ano} · {d.assunto}</span><Button variant="outline" size="sm" onClick={()=>setView(d.id)}>Visualizar</Button><Button size="sm" onClick={async()=>{try{const [{gerarPDF},{carregarExtras}]=await Promise.all([import('@/lib/pdf'),import('@/lib/assinaturas-eletronicas')]);const {data:full,error}=await supabase.from('documentos').select('dados').eq('id',d.id).single();if(error||!full)throw error;await gerarPDF(full.dados as never,true,await carregarExtras(d.id));}catch{toast.error('Não foi possível baixar o PDF.');}}}>Baixar PDF</Button></div>)}</>}
  {data.admin&&<>
  <section className="space-y-3 border-t border-primary-foreground/30 pt-4 text-primary-foreground"><h2 className="text-lg font-bold">Funções para assinatura</h2><form className="flex gap-2" onSubmit={e=>{e.preventDefault();adicionarFuncao();}}><Input aria-label="Nova função" className="bg-card text-card-foreground" required maxLength={200} value={funcao} onChange={e=>setFuncao(e.target.value)}/><Button type="submit">Adicionar</Button></form>{data.funcoes.map(f=><div key={f.id} className="flex items-center justify-between gap-2"><span>{f.nome}</span><Button variant="outline" size="sm" onClick={async()=>{const {error}=await supabase.from('funcoes_predefinidas').delete().eq('id',f.id);if(error)toast.error('Não foi possível excluir.');else refetch();}}>Remover</Button></div>)}</section>
  </>}
  <DocumentNotifications/><SectorCollaborators/><DocumentViewer id={view} onClose={()=>setView(null)}/></main></div>;
}
