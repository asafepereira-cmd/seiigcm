import { useEffect, useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { aplicarModelo, conteudoModelo } from '@/lib/document-models';
import type { Documento } from '@/lib/documento';

type Model = { id: string; nome: string; tipo: string; conteudo: unknown };
export function UnitTemplates({ doc, onApply }: { doc: Documento; onApply: (doc: Documento) => void }) {
  const [models, setModels] = useState<Model[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState('');
  async function load() {
    const { data, error } = await supabase.from('modelos_unidade').select('id,nome,tipo,conteudo').order('nome');
    if (error) toast.error('Não foi possível carregar os modelos.'); else setModels(data ?? []);
  }
  useEffect(() => { void load(); }, []);
  const compatible = models.filter(m => m.tipo === doc.tipo);
  return <div className="space-y-2 border-b pb-3">
    <div className="flex flex-wrap items-center gap-2">
      <Star className="size-4" /><span className="mr-auto text-sm font-semibold">Modelos favoritos da unidade</span>
      <Button size="icon" variant="outline" title="Salvar texto como modelo" aria-label="Salvar texto como modelo" disabled={!doc.corpo.trim()} onClick={() => { setName(''); setOpen(true); }}><Star className="size-4" /></Button>
    </div>
    <div className="flex flex-wrap gap-2">
      <select aria-label="Modelo favorito da unidade" className="h-9 min-w-0 flex-1 rounded-md border bg-card px-2 text-sm" value={compatible.some(m => m.id === selected) ? selected : ''} onChange={e => setSelected(e.target.value)}>
        <option value="">{compatible.length ? 'Selecionar modelo' : 'Nenhum modelo deste tipo'}</option>{compatible.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
      </select>
      <Button size="sm" variant="outline" disabled={!compatible.some(m => m.id === selected)} onClick={() => {
        const model = compatible.find(m => m.id === selected); if (!model) return;
        if (doc.corpo.trim() && !confirm('Substituir o texto atual pelo modelo?')) return;
        onApply(aplicarModelo(doc, model.conteudo as ReturnType<typeof conteudoModelo>)); toast.success('Modelo aplicado.');
      }}>Aplicar</Button>
      <Button size="icon" variant="outline" aria-label="Excluir modelo selecionado" title="Excluir modelo selecionado" disabled={!compatible.some(m => m.id === selected)} onClick={async () => {
        if (!confirm('Excluir este modelo da unidade?')) return;
        const { error } = await supabase.from('modelos_unidade').delete().eq('id', selected);
        if (error) toast.error('Não foi possível excluir.'); else { setSelected(''); await load(); }
      }}><Trash2 className="size-4" /></Button>
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Salvar modelo da unidade</DialogTitle></DialogHeader>
      <form className="space-y-3" onSubmit={async e => { e.preventDefault(); setBusy(true);
        try { const { error } = await supabase.from('modelos_unidade').insert({ nome: name.trim(), tipo: doc.tipo, conteudo: conteudoModelo(doc) as never }); if (error) throw error; await load(); setOpen(false); toast.success('Modelo salvo na unidade.'); }
        catch { toast.error('Não foi possível salvar o modelo.'); } finally { setBusy(false); }
      }}><Input aria-label="Nome do modelo" placeholder="Nome do modelo" maxLength={120} required value={name} onChange={e => setName(e.target.value)} /><Button type="submit" disabled={busy || !name.trim()}>Salvar modelo</Button></form>
    </DialogContent></Dialog>
  </div>;
}
