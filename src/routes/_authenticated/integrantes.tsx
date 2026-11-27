import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { MemberDirectory } from '@/components/MemberDirectory';
import { MemberForm } from '@/components/MemberForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRequireSession } from '@/hooks/use-session';

export const Route = createFileRoute('/_authenticated/integrantes')({
  head: () => ({ meta: [
    { title: 'Integrantes e minutas — SEII GCM' },
    { name: 'description', content: 'Cadastro, consulta, documentos e histórico dos integrantes do CEM XXXIII.' },
    { property: 'og:title', content: 'Integrantes e minutas — SEII GCM' },
    { property: 'og:description', content: 'Dossiês individuais e minutas para assinatura física.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Integrantes,
});

function Integrantes() {
  const { ready, isAdmin } = useRequireSession(false);
  const [tab, setTab] = useState('consulta');
  if (!ready) return null;
  return <div className="min-h-screen"><AppHeader /><main className="mx-auto max-w-7xl px-4 py-8"><div className="mb-6"><h1 className="text-2xl font-bold text-foreground">Integrantes</h1><p className="mt-1 text-sm text-foreground/75">Cadastro, consulta, minutas físicas e acompanhamento individual.</p></div>
    {!isAdmin ? <section className="rounded-lg border bg-card p-6 text-card-foreground"><h2 className="font-semibold">Acesso restrito</h2><p className="mt-2 text-sm text-muted-foreground">Este módulo está disponível somente para o administrador.</p></section> : <Tabs value={tab} onValueChange={setTab}><TabsList className="grid w-full max-w-md grid-cols-2"><TabsTrigger value="consulta">Consultar integrante</TabsTrigger><TabsTrigger value="novo">Novo integrante</TabsTrigger></TabsList><TabsContent value="consulta" className="mt-5"><MemberDirectory /></TabsContent><TabsContent value="novo" className="mt-5"><MemberForm /></TabsContent></Tabs>}
  </main></div>;
}
