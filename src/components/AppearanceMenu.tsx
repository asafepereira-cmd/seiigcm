import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Archive, Building2, Check, ContactRound, FilePlus2, FileSignature, FolderOpen, FolderPlus, MoreVertical, Moon, Sun, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { aplicarTema, CHAVE_TEMA, type TemaInterface } from '@/lib/theme';

export function AppearanceMenu({ admin }: { admin: boolean }) {
  const [tema, setTema] = useState<TemaInterface>('escuro');
  useEffect(() => { setTema(document.documentElement.classList.contains('light') ? 'claro' : 'escuro'); }, []);
  function escolher(valor: TemaInterface) { setTema(valor); aplicarTema(valor, window.localStorage); }
  return <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Mais opções e aparência" title="Mais opções e aparência" className="hover:bg-primary-foreground/10 hover:text-primary-foreground"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-64"><DropdownMenuLabel>Atalhos</DropdownMenuLabel>
      <DropdownMenuItem asChild><Link to="/" search={{}}><FilePlus2 />Novo documento</Link></DropdownMenuItem>
      <DropdownMenuItem asChild><Link to="/processos"><FolderPlus />Novo processo</Link></DropdownMenuItem>
      <DropdownMenuItem asChild><Link to="/processos"><FolderOpen />Acessar processos</Link></DropdownMenuItem>
      <DropdownMenuItem asChild><Link to="/painel"><FileSignature />Acessar painel para assinaturas</Link></DropdownMenuItem>
      <DropdownMenuItem asChild><Link to="/arquivos"><Archive />Arquivos</Link></DropdownMenuItem>
      {admin && <><DropdownMenuSeparator /><DropdownMenuLabel>Administração</DropdownMenuLabel><DropdownMenuItem asChild><Link to="/unidades"><Building2 />Gestão de unidades</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/integrantes"><ContactRound />Integrantes e minutas</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/contas"><UsersRound />Painel de contas</Link></DropdownMenuItem></>}
      <DropdownMenuSeparator /><DropdownMenuLabel>Visual do sistema</DropdownMenuLabel>
      <DropdownMenuItem onSelect={() => escolher('claro')}><Sun />Claro — SEI clássico{tema === 'claro' && <Check className="ml-auto" />}</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => escolher('escuro')}><Moon />Escuro — atual{tema === 'escuro' && <Check className="ml-auto" />}</DropdownMenuItem>
      <DropdownMenuSeparator /><p className="px-2 py-1 text-xs text-muted-foreground">A preferência fica salva neste aparelho.</p>
    </DropdownMenuContent>
  </DropdownMenu>;
}

export { CHAVE_TEMA };
