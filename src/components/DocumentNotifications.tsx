import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { DocumentViewer } from './DocumentViewer';

export function DocumentNotifications() {
  const [docs, setDocs] = useState<{ id: string; tipo: string; numero: number; ano: number; assunto: string }[]>([]);
  const [view, setView] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      const { data: notices, error } = await supabase.from('documento_avisos').select('documento_id');
      if (error || !active) return;
      if (!notices?.length) { setDocs([]); return; }
      const { data } = await supabase.from('documentos').select('id,tipo,numero,ano,assunto').in('id', notices.map(n => n.documento_id)).eq('status', 'assinado');
      if (active) setDocs(data ?? []);
    }
    void load();
    const timer = window.setInterval(load, 15_000);
    window.addEventListener('focus', load);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', load); };
  }, []);
  if (!docs.length) return null;
  return <section className="space-y-3 text-primary-foreground"><h2 className="font-bold">Assinaturas concluídas</h2>{docs.map(d => <article key={d.id} className="flex flex-wrap items-center gap-3 rounded-md bg-card p-4 text-card-foreground"><p className="mr-auto">{d.tipo} Nº {String(d.numero).padStart(3, '0')}/{d.ano} · {d.assunto}</p><Button variant="outline" onClick={() => setView(d.id)}>Visualizar / Baixar PDF assinado</Button><Button variant="ghost" onClick={async () => { const { error } = await supabase.from('documento_avisos').delete().eq('documento_id', d.id); if (!error) setDocs(current => current.filter(x => x.id !== d.id)); }}>Dispensar aviso</Button></article>)}<DocumentViewer id={view} onClose={() => setView(null)}/></section>;
}