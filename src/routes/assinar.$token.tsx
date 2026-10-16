import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getSignRequest, signDocument } from "@/lib/assinatura.functions";
import { GESTORAS, numeroFormatado } from "@/lib/documento";
import { dataHora } from "@/lib/assinaturas-eletronicas";

export const Route = createFileRoute("/assinar/$token")({
  head: () => ({
    meta: [
      { title: "Assinar despacho — S.E.I.GCM-CEMXXXIII" },
      { name: "description", content: "Assinatura eletrônica de despacho da Coordenação de Comunicação e Mídia." },
      { property: "og:title", content: "Assinar despacho — S.E.I.GCM-CEMXXXIII" },
      { property: "og:description", content: "Assinatura eletrônica de despacho." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Assinar,
});

type Req = Awaited<ReturnType<typeof getSignRequest>>;

function Assinar() {
  const { token } = Route.useParams();
  const fetchReq = useServerFn(getSignRequest);
  const sign = useServerFn(signDocument);
  const [req, setReq] = useState<Req | null>(null);
  const [decisao, setDecisao] = useState<"deferido" | "indeferido" | null>(null);
  const [obs, setObs] = useState("");
  const [ciente, setCiente] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  const load = () => fetchReq({ data: { token } }).then(setReq).catch(() => setReq({ found: false }));
  useEffect(() => { load(); }, [token]);

  async function assinar() {
    if (!decisao) return;
    setBusy(true); setErro("");
    try { await sign({ data: { token, decisao, observacoes: obs } }); await load(); }
    catch { setErro("Não foi possível assinar. O link pode já ter sido usado."); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <div className="rounded-xl bg-card p-6 text-card-foreground shadow-lg">
        {req === null ? <p>Carregando...</p> : !req.found ? (
          <p>Link de assinatura inválido.</p>
        ) : (() => {
          const g = req.nome ? {nome:req.nome,cargo:req.cargo ?? ""} : GESTORAS[req.gestora];
          return (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Assinatura eletrônica · S.E.I.GCM-CEMXXXIII</p>
                <h1 className="text-xl font-bold">{numeroFormatado(req.doc)}</h1>
                <p className="mt-1"><b>Assunto:</b> {req.doc.assunto}</p>
                <p><b>Para:</b> {req.doc.para}</p>
              </div>
              <div className="max-h-64 overflow-auto whitespace-pre-line rounded-md border bg-paper p-3 text-sm text-paper-ink">{req.doc.corpo}</div>
              {req.assinadoEm ? (
                <div className="flex items-start gap-3 rounded-md border border-primary/40 bg-primary/10 p-4">
                  <BadgeCheck className="h-6 w-6 shrink-0 text-primary" />
                  <p className="text-sm">Documento assinado eletronicamente por <b>{g.nome}</b>, {g.cargo}, em {dataHora(req.assinadoEm).data}, às {dataHora(req.assinadoEm).hora}. Decisão: <b>{req.decisao === "indeferido" ? "Indeferido" : "Deferido"}</b>.</p>
                </div>
              ) : (
                <>
                  {req.termo && <p className="whitespace-pre-line text-sm">{req.termo}</p>}
                  <p className="text-sm">Eu, <b>{g.nome}</b>, {g.cargo}, declaro que li e tomei ciência do conteúdo deste documento, emitido por {req.doc.assinante}, e registro abaixo meu despacho.</p>
                  <div className="flex gap-2">
                    <Button variant={decisao === "deferido" ? "default" : "outline"} onClick={() => setDecisao("deferido")}>Deferido</Button>
                    <Button variant={decisao === "indeferido" ? "default" : "outline"} onClick={() => setDecisao("indeferido")}>Indeferido</Button>
                  </div>
                  <div>
                    <label htmlFor="obs" className="text-sm font-medium">Observações (opcional)</label>
                    <Textarea id="obs" maxLength={600} value={obs} onChange={e => setObs(e.target.value)} rows={4} />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={ciente} onChange={e => setCiente(e.target.checked)} /> Estou ciente e concordo em assinar eletronicamente.
                  </label>
                  {erro && <p className="text-sm text-destructive">{erro}</p>}
                  <Button className="w-full" disabled={!decisao || !ciente || busy} onClick={assinar}>{busy ? "Assinando..." : "Assinar"}</Button>
                </>
              )}
            </div>
          );
        })()}
      </div>
    </main>
  );
}
