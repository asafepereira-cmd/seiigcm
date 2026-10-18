export type RespostasTermo = {
  participantes: string[];
  finalidades: string[];
  canais: string[];
  nomeParticipante: string;
  responsavel: string;
  nomeSignatario: string;
  funcaoSignatario: string;
};

export const PERGUNTAS_TERMO = [
  {
    id: 'participantes' as const,
    titulo: 'Pergunta 1 — Quem terá a imagem e a voz utilizadas no vídeo?',
    opcoes: ['Aluno menor de idade', 'Aluno maior de idade', 'Professor ou servidor', 'Colaborador ou prestador de serviços', 'Participante externo', 'Outro'],
  },
  {
    id: 'finalidades' as const,
    titulo: 'Pergunta 2 — Qual será a finalidade do vídeo?',
    opcoes: ['Institucional', 'Educativa ou pedagógica', 'Divulgação de eventos e projetos', 'Publicidade e promoção institucional', 'Cobertura de atividades e cerimônias', 'Outra finalidade'],
  },
  {
    id: 'canais' as const,
    titulo: 'Pergunta 3 — Onde o vídeo poderá ser publicado? (pode selecionar mais de um)',
    opcoes: ['Instagram e outras redes sociais', 'Site institucional', 'YouTube', 'Apresentações e eventos institucionais', 'Arquivos e acervos institucionais', 'Outros canais'],
  },
];

function lista(itens: string[]) {
  if (itens.length === 1) return itens[0]!.toLowerCase();
  return `${itens.slice(0, -1).map(i => i.toLowerCase()).join(', ')} e ${itens[itens.length - 1]!.toLowerCase()}`;
}

export function montarMinutaTermo(r: RespostasTermo) {
  const menor = r.participantes.includes('Aluno menor de idade');
  const assunto = menor
    ? 'Autorização de uso de imagem e voz de criança/adolescente'
    : 'Autorização de uso de imagem e voz';
  const partes: string[] = [
    `TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM E VOZ`,
    ``,
    `Pelo presente instrumento, ${r.responsavel.trim() || r.nomeParticipante.trim() || 'o(a) signatário(a) abaixo identificado(a)'}${menor ? `, na qualidade de responsável legal de ${r.nomeParticipante.trim() || 'o(a) menor abaixo identificado(a)'}` : ''}, AUTORIZA o Colégio Estadual Militarizado Fernando Grangeiro de Menezes — CEM XXXIII, por meio da Coordenação de Comunicação e Mídia (CCM), a captar e utilizar a imagem e a voz ${menor ? 'do(a) menor identificado(a)' : 'do(a) autorizante'}, nos termos a seguir.`,
    ``,
    `1. IDENTIFICAÇÃO. Participante: ${r.nomeParticipante.trim() || '____________________________'}, enquadrado como: ${r.participantes.join(', ').toLowerCase() || '________________'}.${menor ? ` Responsável legal: ${r.responsavel.trim() || '____________________________'}.` : ''}`,
    ``,
    `2. AUTORIZAÇÃO DE CAPTAÇÃO. Fica autorizada a captação de imagem e voz em fotografias, filmagens e gravações de áudio realizadas no âmbito das atividades do CEM XXXIII.`,
    ``,
    `3. AUTORIZAÇÃO DE DIVULGAÇÃO. Fica autorizada, de forma independente da captação, a divulgação do material com finalidade ${lista(r.finalidades) || '________________'}, nos seguintes canais: ${lista(r.canais) || '________________'}.`,
    ``,
    `4. VIGÊNCIA E GRATUIDADE. A autorização é concedida a título gratuito, por prazo indeterminado, podendo ser revogada a qualquer tempo mediante comunicação escrita à Coordenação de Comunicação e Mídia, sem efeitos retroativos ao material já publicado.`,
    ``,
    `5. DECLARAÇÃO. Declaro estar ciente de que este termo não transfere direitos patrimoniais e que o material será utilizado exclusivamente nas finalidades e canais aqui autorizados.`,
    ``,
    `Por ser expressão da verdade, firmo o presente termo.`,
  ];
  const pendencias: string[] = [];
  if (!r.nomeParticipante.trim()) pendencias.push('Falta informar o nome completo do participante.');
  if (menor && !r.responsavel.trim()) pendencias.push('Tratando-se de menor de idade, é obrigatório informar o responsável legal.');
  if (!r.participantes.length) pendencias.push('Responda à pergunta 1 (quem terá a imagem e a voz utilizadas).');
  if (!r.finalidades.length) pendencias.push('Responda à pergunta 2 (finalidade do vídeo).');
  if (!r.canais.length) pendencias.push('Responda à pergunta 3 (canais de publicação).');
  return { assunto, corpo: partes.join('\n'), pendencias };
}
