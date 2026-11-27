import { DocumentHeader } from './DocumentHeader';
import { dataExtenso } from '@/lib/documento';
import type { MinutaFisica } from '@/lib/minutas';

export function MinutaFisicaPreview({ minuta }: { minuta: MinutaFisica }) {
  return <div aria-label="Prévia da minuta para assinatura física" className="document-preview aspect-[210/297] w-full overflow-auto rounded-sm bg-paper p-[6%] font-[Times_New_Roman,serif] text-[10px] text-paper-ink shadow-paper lg:text-[11px]">
    <DocumentHeader />
    <p className="mt-4 text-right">Boa Vista - {dataExtenso(minuta.data)}</p>
    <p className="mt-5 text-center text-[0.9em] font-bold">MINUTA PARA ASSINATURA FÍSICA</p>
    <h2 className="mt-1 text-center font-bold">{minuta.titulo}</h2>
    <div className="mt-5">{minuta.conteudo.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map((p, i) => <p key={i} className="mb-3 whitespace-pre-line text-justify">{p}</p>)}</div>
    <p className="mt-5 text-center font-sans text-[0.75em]">MINUTA.SEII.CEMXXXIII — SEM NUMERAÇÃO OFICIAL</p>
  </div>;
}
