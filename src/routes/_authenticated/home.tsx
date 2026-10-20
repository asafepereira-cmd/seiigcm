import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AppHeader, AppFooter } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { DocumentNotifications } from '@/components/DocumentNotifications';
import { supabase } from '@/integrations/supabase/client';
import { FilePlus2, FolderOpen, FileSignature, ScrollText, Users, FileText, ClipboardList } from 'lucide-react';

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
  return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0] ?? '';
}

function Home() {
  const [admin, setAdmin] = useState(false);
  const [podeEmitir, setPodeEmitir] = useState(false);
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState('');
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? '';
      const [{ data: roles }, { data: p }] = await Promise.all([
        supabase.from('user_roles').select('role'),
        supabase.from('paineis').select('nome,funcao,pode_emitir').eq('user_id', uid).maybeSingle(),
      ]);
      const rs = (roles ?? []).map(r => r.role as string);
      const adm = rs.includes('admin');
      setAdmin(adm);
      setPodeEmitir(adm || (p?.pode_emitir ?? false));
      setNome(adm ? 'Asafe Felix' : primeiroEUltimo(p?.nome ?? ''));
      setFuncao(adm ? 'Coordenador de Comunicação e Mídia' : (p?.funcao ?? ''));
    })();
  }, []);
  const botoes: { label: string; to: string; icon: typeof FilePlus2; show: boolean }[] = [
    { label: 'Novo processo', to: '/processos', icon: FolderOpen, show: podeEmitir },
    { label: 'Novo documento', to: '/', icon: FilePlus2, show: podeEmitir },
    { label: 'Novo termo/contrato', to: '/termos', icon: ScrollText, show: podeEmitir },
    { label: 'Acessar painel para assinaturas', to: '/painel', icon: FileSignature, show: true },
    { label: 'Acessar arquivos', to: '/historico', icon: FileText, show: true },
    { label: 'Acessar processos', to: '/processos', icon: ClipboardList, show: true },
    { label: 'Acessar painel de contas', to: '/contas', icon: Users, show: admin },
    { label: 'Novo painel SEII', to: '/painel', icon: Users, show: admin },
  ].filter(b => b.show && !(admin && ['Acessar painel para assinaturas', 'Novo processo', 'Acessar arquivos'].includes(b.label)));
  return (
    <div className="flex min-h-screen flex-col bg-primary">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 text-center">
        <h1 className="text-2xl font-bold text-primary-foreground">Olá{nome ? `, ${nome}` : ''}!</h1>
        {funcao && <p className="mt-1 text-primary-foreground/80">{funcao}</p>}
        <div className="mx-auto mt-8 grid max-w-sm gap-3">
          {botoes.map(b => (
            <Button key={b.label} asChild variant="secondary" size="lg" className="justify-start gap-3 text-base">
              <Link to={b.to}><b.icon className="h-5 w-5" /> {b.label}</Link>
            </Button>
          ))}
        </div>
        <div className="mt-8 text-left"><DocumentNotifications/></div>
      </main>
      <AppFooter />
    </div>
  );
}
