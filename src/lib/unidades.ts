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