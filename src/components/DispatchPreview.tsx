import { assinantesDespacho, type Despacho } from "@/lib/documento";
import { DocumentHeader } from './DocumentHeader';

export function DispatchPreview({ opcao }: { opcao: Despacho }) {
  const gestoras = assinantesDespacho(opcao);
  return (
    <div aria-label="Página de despacho" className="dispatch-sheet bg-paper text-paper-ink shadow-paper">
      <div className="dispatch-header">
        <DocumentHeader />
      </div>
      <div className="dispatch-box">
        <b>Despacho / Gestão</b>
        <div className="dispatch-options">( ) Deferido<br />( ) Indeferido</div>
        <p className="dispatch-observations">Observações:</p>
        <div className="dispatch-lines" aria-label="Linhas para observações">
          {Array.from({ length: 6 }, (_, i) => <div key={i} />)}
        </div>
        <div className={`dispatch-signers ${gestoras.length === 2 ? "dispatch-signers-both" : ""}`}>
          {gestoras.map((gestora) => (
            <div key={gestora.nome} className="dispatch-signer">
              <div className="dispatch-signature-line" />
              <b>{gestora.nome}<br />{gestora.cargo}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}