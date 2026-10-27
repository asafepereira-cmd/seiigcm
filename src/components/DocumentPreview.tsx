import { dataExtenso, identificacaoDocumento, type Documento } from "@/lib/documento";
import { richParagraphs } from "@/lib/rich-text";
export function DocumentPreview({ doc }: { doc: Documento }) {
  const paras = doc.corpo.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div aria-label="Prévia do documento" className="document-preview aspect-[210/297] w-full overflow-auto rounded-sm bg-paper p-[6%] font-[Times_New_Roman,serif] text-[10px] text-paper-ink shadow-paper lg:text-[11px]">
      <div className="flex items-center gap-2 border-b border-paper-ink/60 pb-1">
        <img src="/brand/brasao.png" alt="" className="w-[11%]" />
        <div className="document-header-text flex-1 text-center text-[0.8em] font-bold">
          GOVERNO DO ESTADO DE RORAIMA<br />SECRETARIA DE EDUCAÇÃO E DESPORTO<br />COLÉGIO ESTADUAL MILITARIZADO FERNANDO GRANGEIRO DE MENEZES<br />{doc.setor?.toUpperCase() || 'COORDENAÇÃO DE COMUNICAÇÃO E MÍDIA DO CEMXXXIII'}
        </div>
        <img src={doc.setor ? "/brand/governo.png" : "/brand/midia.png"} alt="" className={doc.setor ? "w-[10%]" : "w-[15%]"} />
      </div>
      <p className="mt-4 text-[1.1em] font-bold">{identificacaoDocumento(doc)}</p>
      {doc.processo && <p className="mt-1 text-center font-bold break-words">{doc.processo.tema}</p>}
      <p className="text-right font-bold">{doc.cidade} - {dataExtenso(doc.data)}</p>
      {doc.tipo !== "Edital" && <><p className="mt-3 text-justify"><b>Para:</b> {doc.para}</p>
      <p className="text-justify"><b>De:</b> {doc.de}</p></>}
      <p className="mt-2 text-justify"><b>Assunto:</b> {doc.assunto}</p>
      {doc.vocativo && <p className="mt-2 text-justify">{doc.vocativo}</p>}
       {doc.corpoFormatado ? richParagraphs(doc.corpoFormatado).map((runs, i) => <p key={i} className="mt-2 whitespace-pre-line text-justify">{runs.map((run, j) => <span key={j} className={`${run.bold ? "font-bold" : ""} ${run.italic ? "italic" : ""} ${run.underline ? "underline" : ""}`}>{run.text}</span>)}</p>) : paras.map((p, i) => <p key={i} className="mt-2 text-justify">{p}</p>)}
      {doc.fecho && <p className="mt-2 text-justify">{doc.fecho}</p>}
    </div>
  );
}
