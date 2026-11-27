import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AppHeader, AppFooter } from '@/components/AppHeader';
import { DocumentNotifications } from '@/components/DocumentNotifications';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/_authenticated/home')({
  head: () => ({ meta: [
    { title: 'Home — SEII GCM' },
    { name: 'description', content: 'Página inicial do Sistema Eletrônico Interno de Informações do CEM XXXIII.' },
    { property: 'og:title', content: 'Home — SEII GCM' },
    { property: 'og:description', content: 'Página inicial do SEII GCM.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Home,
});

function primeiroEUltimo(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return p.slice(0, 2).join(' ');
}

function Home() {
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState('');
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? '';
      const [{ data: roles }, { data: p }] = await Promise.all([
        supabase.from('user_roles').select('role'),
        supabase.from('paineis').select('nome,funcao,tipo_painel,setor').eq('user_id', uid).maybeSingle(),
      ]);
      const adm = (roles ?? []).some(r => r.role === 'admin');
      setNome(p?.tipo_painel === 'setor' ? (p.setor || p.nome) : primeiroEUltimo(p?.nome || String(u.user?.user_metadata['display_name'] || (adm ? 'Asafe Pereira' : ''))));
      setFuncao(adm ? 'Coordenador de Comunicação e Mídia' : (p?.funcao ?? ''));
    })();
  }, []);
  return <div className="flex min-h-screen flex-col bg-background"><AppHeader /><main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
    <div className="text-center"><h1 className="text-2xl font-bold text-foreground">Olá!{nome ? ` ${nome}` : ''}</h1>{funcao && <p className="mt-1 text-foreground/75">{funcao}</p>}<p className="mx-auto mt-5 max-w-md text-sm text-foreground/70">Os atalhos de trabalho e a escolha entre visual claro e escuro estão no menu de três pontos, no topo.</p></div>
    <div className="mt-8"><DocumentNotifications /></div>
  </main><AppFooter /></div>;
}
