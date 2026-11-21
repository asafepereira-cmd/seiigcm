export type ModeloTipo = { vocativo: string; corpo: string; fecho: string };

export const CATALOGO_TIPOS: { grupo: string; tipos: string[] }[] = [
  { grupo: 'Correspondência', tipos: ['Ofício', 'Memorando', 'Despacho', 'Circular', 'Notificação'] },
  { grupo: 'Atos normativos', tipos: ['Ordem de Serviço', 'Edital'] },
  { grupo: 'Registros', tipos: ['Ata', 'Relatório', 'Certidão', 'Declaração'] },
  { grupo: 'Solicitações', tipos: ['Requerimento'] },
  { grupo: 'Instrumentos', tipos: ['Termo', 'Contrato'] },
];

export const TIPOS_DOCUMENTO = CATALOGO_TIPOS.flatMap((g) => g.tipos);

const MODELOS: Record<string, ModeloTipo> = {
  'Despacho': { vocativo: '', corpo: '1. Trata-se de [RESUMO DO ASSUNTO].\n\n2. Encaminho para conhecimento e manifestação, no prazo de [PRAZO].', fecho: 'Atenciosamente,' },
  'Circular': { vocativo: 'Prezados(as),', corpo: 'Comunicamos a todos os setores que [INFORMAÇÃO].\n\nSolicitamos ampla divulgação.', fecho: 'Atenciosamente,' },
  'Notificação': { vocativo: 'Prezado(a) Senhor(a),', corpo: 'Fica Vossa Senhoria notificado(a) de que [FATO], devendo [PROVIDÊNCIA] no prazo de [PRAZO].', fecho: 'Atenciosamente,' },
  'Ordem de Serviço': { vocativo: '', corpo: 'RESOLVE:\n\nArt. 1º Determinar a [SERVIDOR/EQUIPE] a execução de [SERVIÇO], no período de [DATAS].\n\nArt. 2º Esta Ordem de Serviço entra em vigor na data de sua assinatura.', fecho: 'Cumpra-se.' },
  'Ata': { vocativo: '', corpo: 'Aos [DIA] dias do mês de [MÊS] de [ANO], às [HORA], reuniram-se [PARTICIPANTES] para tratar de [PAUTA].\n\n[DELIBERAÇÕES].\n\nNada mais havendo a tratar, foi lavrada a presente ata.', fecho: '' },
  'Relatório': { vocativo: '', corpo: '1. Objetivo: [OBJETIVO].\n\n2. Atividades realizadas: [DESCRIÇÃO].\n\n3. Conclusão: [CONCLUSÃO].', fecho: 'Atenciosamente,' },
  'Certidão': { vocativo: '', corpo: 'CERTIFICO, para os devidos fins, que [FATO CERTIFICADO].', fecho: 'O referido é verdade e dou fé.' },
  'Declaração': { vocativo: '', corpo: 'DECLARO, para os devidos fins, que [NOME], [QUALIFICAÇÃO], [CONTEÚDO DA DECLARAÇÃO].', fecho: 'Por ser verdade, firmo a presente.' },
  'Requerimento': { vocativo: 'Senhor(a) Gestor(a),', corpo: '[NOME], [QUALIFICAÇÃO], vem respeitosamente requerer [PEDIDO], pelos motivos a seguir: [JUSTIFICATIVA].', fecho: 'Nestes termos, pede deferimento.' },
};

export function modeloTipo(tipo: string): ModeloTipo | undefined { return MODELOS[tipo]; }
