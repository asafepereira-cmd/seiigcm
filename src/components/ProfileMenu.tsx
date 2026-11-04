import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { UserRound, LogOut, MessageCircle, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { atualizarMeuNome, alterarMinhaSenha } from '@/lib/profile.functions';
import { contatoAdministrador } from '@/lib/profile';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

export function ProfileMenu() {
  const navigate = useNavigate();
  const saveName = useServerFn(atualizarMeuNome);
  const savePassword = useServerFn(alterarMinhaSenha);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [setor, setSetor] = useState('');
  const [email, setEmail] = useState('');
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setCurrent(''); setPassword('');
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setEmail(data.user.email ?? '');
      const { data: p } = await supabase.from('paineis').select('nome,setor,tipo_painel').eq('user_id', data.user.id).maybeSingle();
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id);
      const admin = roles?.some(r => r.role === 'admin');
      setNome(p?.tipo_painel === 'setor' ? p.setor || p.nome : p?.nome || String(data.user.user_metadata['display_name'] || (admin ? 'Asafe Pereira da Silva Felix' : '')));
      setSetor(p?.setor || (admin ? 'Coordenação de Comunicação e Mídia' : ''));
    })();
  }, [open]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try { await action(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar.'); }
    finally { setBusy(false); }
  }
  async function sair() {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error('Não foi possível sair.'); return; }
    setOpen(false); await navigate({ to: '/login' });
  }
  return <>
    <Button size="icon" variant="ghost" aria-label="Perfil" title="Perfil" className="hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => setOpen(true)}><UserRound className="h-5 w-5" /></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90svh] overflow-y-auto"><DialogHeader><DialogTitle>Perfil</DialogTitle></DialogHeader>
      <form className="space-y-2 border-b pb-4" onSubmit={e => { e.preventDefault(); void run(async () => { await saveName({ data: { nome } }); toast.success('Nome atualizado'); }); }}><Label htmlFor="profile-name">Nome / setor</Label><Input id="profile-name" value={nome} maxLength={200} required onChange={e => setNome(e.target.value)} /><Button disabled={busy || !nome.trim()}>Alterar nome</Button></form>
      <form className="space-y-2 border-b pb-4" onSubmit={e => { e.preventDefault(); void run(async () => { const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/home` }); if (error) throw error; toast.success('Confira seu e-mail para confirmar a alteração.'); }); }}><Label htmlFor="profile-email">E-mail</Label><Input id="profile-email" type="email" value={email} required onChange={e => setEmail(e.target.value)} /><Button disabled={busy}>Alterar e-mail</Button></form>
      <form className="space-y-2 border-b pb-4" onSubmit={e => { e.preventDefault(); void run(async () => { await savePassword({ data: { atual: current, nova: password } }); setCurrent(''); setPassword(''); toast.success('Senha atualizada'); }); }}><Label htmlFor="profile-current">Senha atual</Label><Input id="profile-current" type="password" autoComplete="current-password" value={current} required onChange={e => setCurrent(e.target.value)} /><Label htmlFor="profile-password">Nova senha</Label><Input id="profile-password" type="password" autoComplete="new-password" minLength={8} value={password} required onChange={e => setPassword(e.target.value)} /><Button disabled={busy || !current || !password}>Alterar senha</Button></form>
      <Button asChild variant="outline"><a href={contatoAdministrador(nome, setor === nome ? '' : setor)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />Fale com o administrador!</a></Button>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void sair()}><ArrowLeftRight className="h-4 w-4" />Trocar de conta</Button><Button variant="outline" disabled={busy} onClick={() => void sair()}><LogOut className="h-4 w-4" />Sair</Button></div>
    </DialogContent></Dialog>
  </>;
}