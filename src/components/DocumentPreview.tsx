import { dataExtenso, numeroFormatado, type Documento } from "@/lib/documento";
import { richParagraphs } from "@/lib/rich-text";
export function DocumentPreview({ doc }: { doc: Documento }) {
  const paras = doc.corpo.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div aria-label="Prévia do documento" className="document-preview aspect-[210/297] w-full overflow-auto rounded-sm bg-paper p-[6%] font-[Times_New_Roman,serif] text-[10px] text-paper-ink shadow-paper lg:text-[11px]">
      <div className="flex items-center gap-2 border-b border-paper-ink/60 pb-1">
        <img src="/brand/brasao.png" alt="" className="w-[11%]" />
        <div className="document-header-text flex-1 text-center text-[0.8em] font-bold">
          GOVERNO DO ESTADO DE RORAIMA<br />SECRETARIA DE EDUCAÇÃO E DESPORTO<br />COLÉGIO ESTADUAL MILITARIZADO FERNANDO GRANGEIRO DE MENEZES<br />COORDENAÇÃO DE COMUNICAÇÃO E MÍDIA DO CEMXXXIII
        </div>
        <img src="/brand/midia.png" alt="" className="w-[15%]" />
      </div>
      <p className="mt-4 text-[1.1em] font-bold">{numeroFormatado(doc)}</p>
      <p className="text-right font-bold">{doc.cidade} - {dataExtenso(doc.data)}</p>
      <p className="mt-3 text-justify"><b>Para:</b> {doc.para}</p>
      <p className="text-justify"><b>De:</b> {doc.de}</p>
      <p className="mt-2 text-justify"><b>Assunto:</b> {doc.assunto}</p>
      {doc.vocativo && <p className="mt-2 text-justify">{doc.vocativo}</p>}
       {doc.corpoFormatado ? richParagraphs(doc.corpoFormatado).map((runs, i) => <p key={i} className="mt-2 whitespace-pre-line text-justify">{runs.map((run, j) => <span key={j} className={`${run.bold ? "font-bold" : ""} ${run.italic ? "italic" : ""} ${run.underline ? "underline" : ""}`}>{run.text}</span>)}</p>) : paras.map((p, i) => <p key={i} className="mt-2 text-justify">{p}</p>)}
      {doc.lista.length > 0 && (
        <div className="mt-2 text-justify">
          <b>{doc.tituloLista || "Participantes"}:</b>
          {doc.lista.map((p, i) => <div key={i}>{p.funcao ? `${p.nome} – ${p.funcao}` : p.nome}</div>)}
        </div>
      )}
      {doc.fecho && <p className="mt-2 text-justify">{doc.fecho}</p>}
      <div className="document-signature-text mx-auto mt-8 text-center font-bold">
        {doc.assinaturaPng && <img src={doc.assinaturaPng} alt="Assinatura do documento" className="mx-auto mb-1 h-14 max-w-[42%] object-contain" />}
        <div className="mx-auto mb-1 w-1/2 border-t border-paper-ink" />
        {doc.assinante.toUpperCase()}<br />{doc.cargo}
      </div>
    </div>
  );
}
