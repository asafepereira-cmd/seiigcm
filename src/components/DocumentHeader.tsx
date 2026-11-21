import { GOVERNO_ESTADUAL, LEMA_ESTADUAL } from '@/lib/document-identity';

export function DocumentHeader() {
  return <header className="document-header-text text-center">
    <img src="/brand/governo.png" alt="Brasão do Estado de Roraima" className="mx-auto mb-2 w-[13%]" />
    <p className="document-government font-bold">{GOVERNO_ESTADUAL}</p>
    <p className="italic">“{LEMA_ESTADUAL}”</p>
  </header>;
}