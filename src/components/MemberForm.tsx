import { useState, type ReactNode } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Download, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MinutaFisicaPreview } from '@/components/MinutaFisicaPreview';
import { registrarMinutaFisica, salvarIntegrante } from '@/lib/integrantes.functions';
import { gerarMinutaPDF } from '@/lib/minuta-pdf';
import { dadosMinutaIniciais, montarMinuta, ROTULOS_MINUTA, TIPOS_MINUTA, type DadosMinuta, type TipoMinuta } from '@/lib/minutas';

export function MemberForm({ onSaved }: { onSaved?: (id: string) => void }) {
  const [tipo, setTipo] = useState<TipoMinuta>('integrante');
  const [dados, setDados] = useState<DadosMinuta>(dadosMinutaIniciais);
  const [integranteId, setIntegranteId] = useState<string>();
  const [snapshot, setSnapshot] = useState('');
  const [busy, setBusy] = useState(false);
  const salvar = useServerFn(salvarIntegrante);
  const registrarMinuta = useServerFn(registrarMinutaFisica);
  const minuta = montarMinuta(tipo, dados);
  const atualizar = <K extends keyof DadosMinuta>(campo: K, valor: DadosMinuta[K]) => setDados(atual => ({ ...atual, [campo]: valor }));

  async function persistir(aviso = true) {
    setBusy(true);
    try {
      const salvo = await salvar({ data: {
        ...(integranteId ? { id: integranteId } : {}), nome: dados.nome, cpf: dados.documento, rg: dados.rg,
        data_nascimento: dados.dataNascimento || null, telefone: dados.telefone, email: dados.email,
        endereco: dados.endereco, vinculo: ROTULOS_MINUTA[tipo], funcao: dados.funcao,
        unidade: dados.unidade, data_ingresso: dados.dataIngresso, situacao: dados.situacao,
        observacoes: dados.observacoes, dados_extras: dados.camposExtras,
      } });
      setIntegranteId(salvo.id); setSnapshot(JSON.stringify({ tipo, dados }));
      if (aviso) toast.success(integranteId ? 'Cadastro atualizado.' : 'Integrante cadastrado. A minuta já pode ser impressa.');
      onSaved?.(salvo.id);
      return salvo.id;
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.'); return undefined; }
    finally { setBusy(false); }
  }

  async function exportar() {
    const id = integranteId && snapshot === JSON.stringify({ tipo, dados }) ? integranteId : await persistir(false);
    if (!id) return;
    setBusy(true);
    try {
      const atual = montarMinuta(tipo, dados);
      await registrarMinuta({ data: { integranteId: id, tipo, titulo: atual.titulo, conteudo: atual.conteudo, dados: { ...dados } } });
      await gerarMinutaPDF(atual);
      toast.success('PDF da minuta gerado e guardado no dossiê.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível gerar a minuta.'); }
    finally { setBusy(false); }
  }

  return <div className="grid gap-6 lg:grid-cols-2">
    <form className="space-y-5 rounded-lg border bg-card p-4 text-card-foreground" onSubmit={event => { event.preventDefault(); void persistir(); }}>
      <div>
        <Label htmlFor="member-draft-type">Modelo de cadastro e minuta</Label>
        <select id="member-draft-type" className="mt-1 h-10 w-full rounded-md border bg-card px-3 text-sm" value={tipo} onChange={event => { setTipo(event.target.value as TipoMinuta); atualizar('vinculo', ROTULOS_MINUTA[event.target.value as TipoMinuta]); }}>
          {TIPOS_MINUTA.map(item => <option key={item} value={item}>{ROTULOS_MINUTA[item]}</option>)}
        </select>
        <p className="mt-2 text-xs text-muted-foreground">A minuta não recebe número oficial nem assinatura eletrônica. O PDF terá espaços para assinatura física.</p>
      </div>
      <fieldset className="grid gap-3 border-t pt-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold">Identificação</legend>
        <Field id="member-name" label="Nome completo / Razão social" className="sm:col-span-2"><Input id="member-name" required minLength={3} maxLength={200} value={dados.nome} onChange={e => atualizar('nome', e.target.value)} /></Field>
        <Field id="member-document" label="CPF / CNPJ"><Input id="member-document" maxLength={30} value={dados.documento} onChange={e => atualizar('documento', e.target.value)} /></Field>
        <Field id="member-rg" label="RG (opcional)"><Input id="member-rg" maxLength={30} value={dados.rg} onChange={e => atualizar('rg', e.target.value)} /></Field>
        <Field id="member-birth" label="Data de nascimento"><Input id="member-birth" type="date" value={dados.dataNascimento} onChange={e => atualizar('dataNascimento', e.target.value)} /></Field>
        <Field id="member-entry" label="Data de ingresso / emissão"><Input id="member-entry" type="date" required value={dados.dataIngresso} onChange={e => atualizar('dataIngresso', e.target.value)} /></Field>
        <Field id="member-phone" label="Telefone"><Input id="member-phone" maxLength={40} value={dados.telefone} onChange={e => atualizar('telefone', e.target.value)} /></Field>
        <Field id="member-email" label="E-mail"><Input id="member-email" type="email" maxLength={200} value={dados.email} onChange={e => atualizar('email', e.target.value)} /></Field>
        <Field id="member-address" label="Endereço" className="sm:col-span-2"><Input id="member-address" maxLength={500} value={dados.endereco} onChange={e => atualizar('endereco', e.target.value)} /></Field>
        <Field id="member-role" label="Função / Atividade"><Input id="member-role" maxLength={200} value={dados.funcao} onChange={e => atualizar('funcao', e.target.value)} /></Field>
        <Field id="member-unit" label="Unidade"><Input id="member-unit" required maxLength={200} value={dados.unidade} onChange={e => atualizar('unidade', e.target.value)} /></Field>
        <Field id="member-status" label="Situação"><select id="member-status" className="h-9 w-full rounded-md border bg-card px-2 text-sm" value={dados.situacao} onChange={e => atualizar('situacao', e.target.value as DadosMinuta['situacao'])}><option>Ativo</option><option>Afastado</option><option>Desligado</option></select></Field>
      </fieldset>
      {tipo === 'credenciamento' && <fieldset className="grid gap-3 border-t pt-4 sm:grid-cols-2"><legend className="px-1 text-sm font-semibold">Credenciamento</legend><Field id="accreditation-company" label="Empresa / Prestador"><Input id="accreditation-company" value={dados.empresa} onChange={e => atualizar('empresa', e.target.value)} /></Field><Field id="accreditation-responsible" label="Responsável legal"><Input id="accreditation-responsible" value={dados.responsavel} onChange={e => atualizar('responsavel', e.target.value)} /></Field><Field id="accreditation-object" label="Objeto" className="sm:col-span-2"><Textarea id="accreditation-object" value={dados.objeto} onChange={e => atualizar('objeto', e.target.value)} /></Field><Field id="accreditation-validity" label="Vigência (opcional)" className="sm:col-span-2"><Input id="accreditation-validity" value={dados.vigencia} onChange={e => atualizar('vigencia', e.target.value)} /></Field></fieldset>}
      {tipo === 'voluntariado' && <fieldset className="grid gap-3 border-t pt-4 sm:grid-cols-2"><legend className="px-1 text-sm font-semibold">Ação ou evento</legend><Field id="volunteer-event" label="Ação / Evento" className="sm:col-span-2"><Input id="volunteer-event" value={dados.evento} onChange={e => atualizar('evento', e.target.value)} /></Field><Field id="volunteer-place" label="Local"><Input id="volunteer-place" value={dados.local} onChange={e => atualizar('local', e.target.value)} /></Field><Field id="volunteer-period" label="Período"><Input id="volunteer-period" value={dados.vigencia} onChange={e => atualizar('vigencia', e.target.value)} /></Field></fieldset>}
      {tipo === 'outros' && <fieldset className="space-y-3 border-t pt-4"><legend className="px-1 text-sm font-semibold">Termo personalizado</legend><Field id="custom-title" label="Título do termo"><Input id="custom-title" value={dados.objeto} onChange={e => atualizar('objeto', e.target.value)} /></Field>{dados.camposExtras.map((campo, indice) => <div key={indice} className="flex items-end gap-2"><Field id={`custom-label-${indice}`} label="Campo"><Input id={`custom-label-${indice}`} aria-label={`Nome do campo ${indice + 1}`} value={campo.rotulo} onChange={e => atualizar('camposExtras', dados.camposExtras.map((c, i) => i === indice ? { ...c, rotulo: e.target.value } : c))} /></Field><Field id={`custom-value-${indice}`} label="Conteúdo"><Input id={`custom-value-${indice}`} aria-label={`Conteúdo do campo ${indice + 1}`} value={campo.valor} onChange={e => atualizar('camposExtras', dados.camposExtras.map((c, i) => i === indice ? { ...c, valor: e.target.value } : c))} /></Field><Button type="button" size="icon" variant="outline" aria-label={`Remover campo ${indice + 1}`} onClick={() => atualizar('camposExtras', dados.camposExtras.filter((_, i) => i !== indice))}><Trash2 className="h-4 w-4" /></Button></div>)}<Button type="button" variant="outline" disabled={dados.camposExtras.length >= 30} onClick={() => atualizar('camposExtras', [...dados.camposExtras, { rotulo: '', valor: '' }])}><Plus className="h-4 w-4" />Adicionar campo</Button><Field id="custom-text" label="Texto e condições"><Textarea id="custom-text" rows={8} value={dados.textoPersonalizado} onChange={e => atualizar('textoPersonalizado', e.target.value)} /></Field></fieldset>}
      <Field id="member-notes" label="Observações internas / do termo"><Textarea id="member-notes" rows={3} value={dados.observacoes} onChange={e => atualizar('observacoes', e.target.value)} /></Field>
      <div className="flex flex-wrap gap-2 border-t pt-4"><Button type="submit" disabled={busy}><Save className="h-4 w-4" />{busy ? 'Aguarde…' : integranteId ? 'Atualizar cadastro' : 'Salvar cadastro'}</Button><Button type="button" variant="outline" disabled={busy || dados.nome.trim().length < 3} onClick={() => void exportar()}><Download className="h-4 w-4" />Gerar PDF para assinatura física</Button></div>
    </form>
    <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start"><p className="mb-2 text-xs font-medium uppercase tracking-wider text-foreground">Prévia da minuta</p><MinutaFisicaPreview minuta={minuta} /></aside>
  </div>;
}

function Field({ id, label, className, children }: { id: string; label: string; className?: string; children: ReactNode }) {
  return <div className={`min-w-0 flex-1 space-y-1.5 ${className ?? ''}`}><Label htmlFor={id} className="text-xs">{label}</Label>{children}</div>;
}
