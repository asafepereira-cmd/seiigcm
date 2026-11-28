import { describe, expect, it } from 'vitest';
import {
  caminhoUnidade,
  descendentesUnidade,
  ordenarUnidadesHierarquia,
  siglaUnidade,
  unidadePermite,
  unidadeSchema,
  type Unidade,
} from '@/lib/unidades';

const gcm: Unidade = {
  id: '11111111-1111-4111-8111-111111111111',
  nome: 'Grupamento de Comunicação e Mídia',
  sigla: 'GCM',
  pai_id: null,
  ativa: true,
  pode_emitir: true,
  pode_receber: true,
};
const ccm: Unidade = {
  id: '22222222-2222-4222-8222-222222222222',
  nome: 'Coordenação de Comunicação e Mídia',
  sigla: 'CCM',
  pai_id: gcm.id,
  ativa: true,
  pode_emitir: true,
  pode_receber: true,
};
const cge: Unidade = {
  id: '33333333-3333-4333-8333-333333333333',
  nome: 'Comissão Grêmio Estudantil',
  sigla: 'CGE',
  pai_id: null,
  ativa: true,
  pode_emitir: false,
  pode_receber: true,
};
const cpg: Unidade = {
  id: '44444444-4444-4444-8444-444444444444',
  nome: 'Comissão Pró-Grêmio',
  sigla: 'CPG',
  pai_id: cge.id,
  ativa: true,
  pode_emitir: true,
  pode_receber: true,
};

describe('regras de unidades organizacionais', () => {
  it('compõe siglas hierárquicas no padrão CEMXXXIII/UNIDADE/SUBUNIDADE', () => {
    expect(siglaUnidade(gcm.id, [gcm, ccm])).toBe('CEMXXXIII/GCM');
    expect(siglaUnidade(ccm.id, [gcm, ccm])).toBe('CEMXXXIII/GCM/CCM');
    expect(siglaUnidade(cpg.id, [cge, cpg])).toBe('CEMXXXIII/CGE/CPG');
  });

  it('bloqueia emissão ou recebimento quando a unidade superior desativa a permissão', () => {
    expect(unidadePermite(ccm.id, [gcm, ccm], 'emitir')).toBe(true);
    expect(unidadePermite(cpg.id, [cge, cpg], 'emitir')).toBe(false);
    expect(unidadePermite(cpg.id, [cge, cpg], 'receber')).toBe(true);

    const gcmInativo: Unidade = { ...gcm, ativa: false };
    expect(unidadePermite(ccm.id, [gcmInativo, ccm], 'emitir')).toBe(false);
    expect(unidadePermite(ccm.id, [gcmInativo, ccm], 'receber')).toBe(false);
  });

  it('identifica descendentes para impedir ciclos na seleção de unidade superior', () => {
    const descendentes = descendentesUnidade(gcm.id, [gcm, ccm, cge, cpg]);
    expect(descendentes.has(gcm.id)).toBe(true);
    expect(descendentes.has(ccm.id)).toBe(true);
    expect(descendentes.has(cge.id)).toBe(false);
  });

  it('ordena unidades em árvore mantendo subunidades logo abaixo da unidade superior', () => {
    const arvore = ordenarUnidadesHierarquia([cpg, ccm, gcm, cge]);
    expect(arvore.map(item => `${item.nivel}:${item.siglaCompleta}`)).toEqual([
      '0:CEMXXXIII/CGE',
      '1:CEMXXXIII/CGE/CPG',
      '0:CEMXXXIII/GCM',
      '1:CEMXXXIII/GCM/CCM',
    ]);
  });

  it('valida sigla e impede auto-vínculo na validação de cadastro', () => {
    expect(unidadeSchema.safeParse({
      nome: 'Coordenação Pedagógica',
      sigla: 'cp',
      pai_id: null,
      ativa: true,
      pode_emitir: true,
      pode_receber: true,
    }).success).toBe(true);

    expect(unidadeSchema.safeParse({
      id: gcm.id,
      nome: 'Grupamento',
      sigla: 'GCM',
      pai_id: gcm.id,
      ativa: true,
      pode_emitir: true,
      pode_receber: true,
    }).success).toBe(false);

    expect(unidadeSchema.safeParse({
      nome: 'Unidade inválida',
      sigla: 'A',
      pai_id: null,
      ativa: true,
      pode_emitir: true,
      pode_receber: true,
    }).success).toBe(false);
  });

  it('não entra em loop ao calcular caminho se houver ciclo nos dados', () => {
    const a: Unidade = { ...gcm, pai_id: ccm.id };
    const b: Unidade = { ...ccm, pai_id: gcm.id };
    expect(caminhoUnidade(a.id, [a, b]).length).toBe(2);
  });
});