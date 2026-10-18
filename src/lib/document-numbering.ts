import { supabase } from '@/integrations/supabase/client';

export function numeroSeguinte(rows: { tipo: string; ano: number; numero: number }[], tipo: string, ano: number) {
  return rows.reduce((max, row) => row.tipo.toLocaleUpperCase('pt-BR') === tipo.toLocaleUpperCase('pt-BR') && row.ano === ano ? Math.max(max, row.numero) : max, 0) + 1;
}

export async function proximoNumeroDocumento(tipo: string, ano: number) {
  const { data, error } = await supabase.from('documentos').select('tipo,ano,numero')
    .ilike('tipo', tipo).eq('ano', ano).order('numero', { ascending: false }).limit(1);
  if (error) throw new Error('Não foi possível consultar a numeração deste tipo de documento.');
  return numeroSeguinte(data ?? [], tipo, ano);
}