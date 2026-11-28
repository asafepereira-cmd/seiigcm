import { z } from 'zod';

export const unidadeSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(3).max(200),
  sigla: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,20}$/, 'Use de 2 a 20 letras ou números na sigla.'),
  pai_id: z.string().uuid().nullable(),
  ativa: z.boolean(),
  pode_emitir: z.boolean(),
  pode_receber: z.boolean(),
}).refine(v => !v.id || v.id !== v.pai_id, 'Uma unidade não pode pertencer a si mesma.');

export type Unidade = { id: string; nome: string; sigla: string; pai_id: string | null; ativa: boolean; pode_emitir: boolean; pode_receber: boolean };

export function caminhoUnidade(id: string, unidades: Unidade[]): Unidade[] {
  const caminho: Unidade[] = [];
  const vistos = new Set<string>();
  let atual = unidades.find(u => u.id === id);
  while (atual && !vistos.has(atual.id)) {
    vistos.add(atual.id);
    caminho.unshift(atual);
    atual = unidades.find(u => u.id === atual?.pai_id);
  }
  return caminho;
}

export function siglaUnidade(id: string, unidades: Unidade[]) {
  return ['CEMXXXIII', ...caminhoUnidade(id, unidades).map(u => u.sigla)].join('/');
}

export function unidadePermite(id: string, unidades: Unidade[], acao: 'emitir' | 'receber') {
  const caminho = caminhoUnidade(id, unidades);
  return caminho.length > 0 && caminho.every(u => u.ativa && (acao === 'emitir' ? u.pode_emitir : u.pode_receber));
}

export function descendentesUnidade(id: string, unidades: Unidade[]): Set<string> {
  const resultado = new Set<string>([id]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const u of unidades) {
      if (u.pai_id && resultado.has(u.pai_id) && !resultado.has(u.id)) {
        resultado.add(u.id);
        mudou = true;
      }
    }
  }
  return resultado;
}

export function ordenarUnidadesHierarquia(unidades: Unidade[]): Array<{ unidade: Unidade; nivel: number; siglaCompleta: string }> {
  const porPai = new Map<string | null, Unidade[]>();
  for (const u of unidades) {
    const chave = u.pai_id && unidades.some(x => x.id === u.pai_id) ? u.pai_id : null;
    const lista = porPai.get(chave) ?? [];
    lista.push(u);
    porPai.set(chave, lista);
  }
  for (const lista of porPai.values()) {
    lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  const saida: Array<{ unidade: Unidade; nivel: number; siglaCompleta: string }> = [];
  const visitados = new Set<string>();
  function percorrer(paiId: string | null, nivel: number) {
    for (const u of porPai.get(paiId) ?? []) {
      if (visitados.has(u.id)) continue;
      visitados.add(u.id);
      saida.push({ unidade: u, nivel, siglaCompleta: siglaUnidade(u.id, unidades) });
      percorrer(u.id, nivel + 1);
    }
  }
  percorrer(null, 0);
  return saida;
}