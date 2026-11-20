import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/termos')({
  beforeLoad: () => { throw redirect({ to: '/historico' }); },
  head: () => ({ meta: [
    { title: 'Termos e contratos em Documentos — SEII GCM' },
    { name: 'description', content: 'Termos e contratos reunidos no editor e na lista de documentos do SEII GCM.' },
    { property: 'og:title', content: 'Termos e contratos em Documentos — SEII GCM' },
    { property: 'og:description', content: 'Todos os tipos documentais no mesmo espaço do SEII GCM.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: () => null,
});
