import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader, AppFooter } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PERGUNTAS_TERMO, montarMinutaTermo, type RespostasTermo } from '@/lib/termo';
import { numeroFormatado } from '@/lib/documento';

export const Route = createFileRoute('/_authenticated/termos')({
  head: () => ({ meta: [
    { title: 'Painel de contratos e termos — SEII GCM' },
    { name: 'description', content: 'Emissão de termos de autorização de uso de imagem e voz do CEM XXXIII.' },
    { property: 'og:title', content: 'Painel de contratos e termos — SEII GCM' },
    { property: 'og:description', content: 'Emissão de termos de autorização de uso de imagem e voz.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Termos,
});

type Row = { id: string; status: string; dados: { tipo: string; numero: number; ano: number; sigla: string; assunto: string; signatarioTermo?: string } };
const VAZIO: RespostasTermo = { participantes: [], finalidades: [], canais: [], nomeParticipante: '', responsavel: '', nomeSignatario: '', funcaoSignatario: '' };

function Termos() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [novo, setNovo] = useState<'termo' | 'contrato' | null>(null);
  const [r, setR] = useState<RespostasTermo>(VAZIO);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('documentos').select('id,status,dados').order('created_at', { ascending: false })
      .then(({ data }) => setRows(((data as Row[] | null) ?? []).filter(d => ['termo', 'contrato'].includes(d.dados.tipo.toLowerCase()))));
  }, [novo]);

  function marcar(campo: 'participantes' | 'finalidades' | 'canais', opcao: string, on: boolean) {
    setR(prev => ({ ...prev, [campo]: on ? [...prev[campo], opcao] : prev[campo].filter(o => o !== opcao) }));
  }

  async function gerar() {
    setBusy(true);
    try {
      const minuta = montarMinutaTermo(r);
      const ano = new Date().getFullYear();
      const dados = {
        tipo: 'Termo', ano, sigla: 'CEMXXXIII/CCM', assunto: minuta.assunto, corpo: minuta.corpo,
        data: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Boa_Vista', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
        destinatario: '', assinante: r.nomeSignatario.trim() ? `${r.nomeSignatario.trim().toUpperCase()}\n${r.funcaoSignatario.trim()}` : 'ASAFE PEREIRA DA SILVA FELIX\nCoordenador de Comunicação e Mídia',
        signatarioTermo: r.nomeSignatario.trim(), respostasTermo: r, pendenciasTermo: minuta.pendencias,
      };
      const { data: id, error } = await supabase.rpc('salvar_documento', { _id: null as unknown as string, _dados: dados as never, _processo: null as unknown as string });
      if (error || !id) throw new Error(error?.message ?? 'Falha ao salvar');
      if (minuta.pendencias.length) toast.warning(`Minuta gerada com pendências: ${minuta.pendencias.join(' ')}`);
      else toast.success('Minuta gerada. Revise e envie para assinatura.');
      setNovo(null); setR(VAZIO);
      navigate({ to: '/', search: { id: id as string } });
    } catch { toast.error('Não foi possível gerar a minuta.'); } finally { setBusy(false); }
  }

  const pendencias = montarMinutaTermo(r).pendencias;
  return (
    <div className="flex min-h-screen flex-col bg-primary">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold text-primary-foreground">Painel de contratos e termos</h1>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setNovo('termo')}>Novo termo</Button>
          <Button variant="secondary" onClick={() => setNovo('contrato')}>Novo contrato</Button>
        </div>
        <section className="space-y-2">
          <h2 className="font-bold text-primary-foreground">Termos e contratos</h2>
          {rows === null ? <p className="text-primary-foreground">Carregando...</p>
            : rows.length === 0 ? <p className="text-primary-foreground">Nenhum termo ou contrato emitido ainda.</p>
            : rows.map(d => (
              <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-card p-3 text-card-foreground">
                <p className="mr-auto min-w-0 truncate text-sm font-semibold">{numeroFormatado(d.dados)} — {d.dados.assunto}{d.dados.signatarioTermo ? ` · ${d.dados.signatarioTermo}` : ''}</p>
                <span className="text-xs text-muted-foreground">{d.status === 'desenvolvendo' ? 'Em desenvolvimento' : d.status === 'enviado' ? 'Enviado' : 'Assinado'}</span>
                <Button size="sm" variant="outline" asChild><Link to="/" search={{ id: d.id }}>Abrir</Link></Button>
                <Button size="sm" variant="outline" asChild><Link to="/historico">Enviar</Link></Button>
              </div>
            ))}
        </section>
      </main>
      <AppFooter />

      <Dialog open={novo === 'contrato'} onOpenChange={o => !o && setNovo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo contrato</DialogTitle></DialogHeader>
          <p className="text-sm">O painel de contratos ainda está em desenvolvimento.</p>
        </DialogContent>
      </Dialog>

      <Dialog open={novo === 'termo'} onOpenChange={o => !o && setNovo(null)}>
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader><DialogTitle>Emissão de termo — autorização de uso de imagem e voz</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Responda ao questionário. O sistema gera uma minuta personalizada e aponta informações ausentes ou que precisam de revisão. A minuta não presume autorização concedida e deve ser revisada por você antes do envio.</p>
            {PERGUNTAS_TERMO.map(p => (
              <fieldset key={p.id} className="space-y-1.5">
                <legend className="text-sm font-semibold">{p.titulo}</legend>
                {p.opcoes.map(o => (
                  <label key={o} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={r[p.id].includes(o)} onCheckedChange={v => marcar(p.id, o, v === true)} /> {o}
                  </label>
                ))}
              </fieldset>
            ))}
            <div><Label htmlFor="t-part">Nome completo do participante</Label><Input id="t-part" maxLength={200} value={r.nomeParticipante} onChange={e => setR({ ...r, nomeParticipante: e.target.value })} /></div>
            {r.participantes.includes('Aluno menor de idade') && (
              <div><Label htmlFor="t-resp">Nome completo do responsável legal (obrigatório para menores)</Label><Input id="t-resp" maxLength={200} value={r.responsavel} onChange={e => setR({ ...r, responsavel: e.target.value })} /></div>
            )}
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Informações do destinatário signatário</legend>
              <div><Label htmlFor="t-sign">Nome completo do signatário</Label><Input id="t-sign" maxLength={200} value={r.nomeSignatario} onChange={e => setR({ ...r, nomeSignatario: e.target.value })} /></div>
              <div><Label htmlFor="t-func">Função do signatário</Label><Input id="t-func" maxLength={200} value={r.funcaoSignatario} onChange={e => setR({ ...r, funcaoSignatario: e.target.value })} /></div>
            </fieldset>
            {pendencias.length > 0 && (
              <div className="rounded-md border border-destructive/50 p-3 text-sm">
                <p className="font-semibold">Pendências apontadas:</p>
                <ul className="list-disc pl-5">{pendencias.map(p => <li key={p}>{p}</li>)}</ul>
              </div>
            )}
            <Button className="w-full" disabled={busy} onClick={gerar}>{busy ? 'Gerando…' : 'Gerar minuta do termo'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
