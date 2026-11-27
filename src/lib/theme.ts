export type TemaInterface = 'escuro' | 'claro';
export const CHAVE_TEMA = 'seii-tema';

export function aplicarTema(tema: TemaInterface, storage?: Pick<Storage, 'setItem'>) {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(tema === 'claro' ? 'light' : 'dark');
    document.documentElement.style.colorScheme = tema === 'claro' ? 'light' : 'dark';
  }
  storage?.setItem(CHAVE_TEMA, tema);
}

export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem('${CHAVE_TEMA}');document.documentElement.classList.add(t==='claro'?'light':'dark');document.documentElement.style.colorScheme=t==='claro'?'light':'dark'}catch(e){document.documentElement.classList.add('dark')}})();`;
