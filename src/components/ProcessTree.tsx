import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, FolderOpen, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { identificacaoDocumento, type Documento } from '@/lib/documento';

export function ProcessTree({ title, documents, attachments = [], selected, onSelect, onAttachment }: {
  title: string;
  documents: { id: string; dados: Documento }[];
  attachments?: { id: string; nome: string }[];
  selected?: string | null | undefined;
  onSelect: (id: string) => void;
  onAttachment?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return <nav aria-label="Árvore do processo" className="min-w-0 border-b pb-4 lg:border-b-0 lg:border-r lg:pr-4">
    <Button variant="ghost" className="h-auto w-full justify-start whitespace-normal px-1 py-2 text-left" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
      {expanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}<FolderOpen className="size-4 shrink-0" /><span className="break-words">{title}</span>
    </Button>
    {expanded && <ul className="ml-3 space-y-1 border-l pl-2">
      {documents.map(d => <li key={d.id}><Button variant={selected === d.id ? 'secondary' : 'ghost'} aria-current={selected === d.id ? 'page' : undefined} className="h-auto w-full justify-start whitespace-normal px-2 py-2 text-left text-xs" onClick={() => onSelect(d.id)}><FileText className="size-4 shrink-0" /><span className="min-w-0 break-words">{identificacaoDocumento(d.dados)}{d.dados.assunto && <span className="mt-1 block font-normal text-muted-foreground">{d.dados.assunto}</span>}</span></Button></li>)}
      {attachments.map(a => <li key={a.id}><Button variant="ghost" className="h-auto w-full justify-start whitespace-normal px-2 py-2 text-left text-xs" onClick={() => onAttachment?.(a.id)}><Paperclip className="size-4 shrink-0" /><span className="break-all">{a.nome}</span></Button></li>)}
      {!documents.length && !attachments.length && <li className="px-2 py-2 text-xs text-muted-foreground">Nenhum documento vinculado.</li>}
    </ul>}
  </nav>;
}