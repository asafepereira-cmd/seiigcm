import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { getVerificacao } from "@/lib/assinatura.functions";
import { GESTORAS, numeroFormatado } from "@/lib/documento";
import { dataHora, SISTEMA } from "@/lib/assinaturas-eletronicas";

export const Route = createFileRoute("/verificar/$id")({
  head: () => ({
    meta: [
      { title: "Verificar documento — S.E.I.GCM-CEMXXXIII" },
      { name: "description", content: "Verificação de autenticidade de documentos do CEM XXXIII." },
      { property: "og:title", content: "Verificar documento — S.E.I.GCM-CEMXXXIII" },
      { property: "og:description", content: "Verificação de autenticidade de documentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Verificar,
});

function Verificar() {
  const { id } = Route.useParams();
  const fetchV = useServerFn(getVerificacao);
  const [v, setV] = useState<Awaited<ReturnType<typeof getVerificacao>> | null>(null);
  useEffect(() => { fetchV({ data: { id } }).then(setV).catch(() => setV({ found: false })); }, [id]);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <div className="space-y-3 rounded-xl bg-card p-6 text-card-foreground shadow-lg">
        <p className="text-sm text-muted-foreground">Verificação · {SISTEMA}</p>
        {v === null ? <p>Carregando...</p> : !v.found ? <p>Documento não encontrado ou não emitido.</p> : (
          <>
            <h1 className="text-xl font-bold">{numeroFormatado(v)}</h1>
            <p><b>Assunto:</b> {v.assunto}</p>
            <Linha texto={`Emitido eletronicamente por ${v.assinante}, ${v.cargo}, em ${dataHora(v.emitidoEm).data}, às ${dataHora(v.emitidoEm).hora}.`} />
            {v.assinaturas.map(a => a.assinadoEm ? (
              <Linha key={a.gestora} texto={`Assinado eletronicamente por ${GESTORAS[a.gestora].nome}, ${GESTORAS[a.gestora].cargo}, em ${dataHora(a.assinadoEm).data}, às ${dataHora(a.assinadoEm).hora}. Decisão: ${a.decisao === "indeferido" ? "Indeferido" : "Deferido"}.`} />
            ) : <p key={a.gestora} className="text-sm text-muted-foreground">Aguardando assinatura de {GESTORAS[a.gestora].nome}.</p>)}
          </>
        )}
      </div>
    </main>
  );
}

function Linha({ texto }: { texto: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-primary/40 bg-primary/10 p-3">
      <BadgeCheck className="h-5 w-5 shrink-0 text-primary" />
      <p className="text-sm">{texto}</p>
    </div>
  );
}
