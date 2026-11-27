import { hojeISO } from './documento';

export const TIPOS_MINUTA = ['integrante', 'credenciamento', 'voluntariado', 'outros'] as const;
export type TipoMinuta = (typeof TIPOS_MINUTA)[number];

export type CampoExtra = { rotulo: string; valor: string };

export type DadosMinuta = {
  nome: string;
  documento: string;
  rg: string;
  dataNascimento: string;
  telefone: string;
  email: string;
  endereco: string;
  vinculo: string;
  funcao: string;
  unidade: string;
  dataIngresso: string;
  situacao: 'Ativo' | 'Afastado' | 'Desligado';
  observacoes: string;
  empresa: string;
  responsavel: string;
  evento: string;
  local: string;
  vigencia: string;
  objeto: string;
  textoPersonalizado: string;
  camposExtras: CampoExtra[];
};

export const ROTULOS_MINUTA: Record<TipoMinuta, string> = {
  integrante: 'Novo integrante',
  credenciamento: 'Termo de credenciamento',
  voluntariado: 'Termo de voluntariado',
  outros: 'Outros — personalizado',
};

export const TITULOS_MINUTA: Record<Exclude<TipoMinuta, 'outros'>, string> = {
  integrante: 'TERMO DE COMPROMISSO E INTEGRAÇÃO - PROJETO CEMXXXIII NA MÍDIA',
  credenciamento: 'TERMO DE CREDENCIAMENTO DE EMPRESA, PRESTADOR DE SERVIÇO, E ENTRE OUTROS',
  voluntariado: 'TERMO DE VOLUNTARIADO EM AÇÃO/EVENTO',
};

export function dadosMinutaIniciais(): DadosMinuta {
  return {
    nome: '', documento: '', rg: '', dataNascimento: '', telefone: '', email: '', endereco: '',
    vinculo: 'Novo integrante', funcao: '', unidade: 'CEMXXXIII/GCM/CCM', dataIngresso: hojeISO(),
    situacao: 'Ativo', observacoes: '', empresa: '', responsavel: '', evento: '', local: '',
    vigencia: '', objeto: '', textoPersonalizado: '', camposExtras: [],
  };
}

const v = (texto: string) => texto.trim() || '________________________________';
const assinatura = (nome: string, funcao: string) => `________________________________\n${v(nome).toUpperCase()}\n${v(funcao)}`;
const extras = (campos: CampoExtra[]) => campos.filter(c => c.rotulo.trim() || c.valor.trim()).map(c => `${v(c.rotulo)}: ${v(c.valor)}`).join('\n');

export type MinutaFisica = { titulo: string; conteudo: string; data: string };

export function montarMinuta(tipo: TipoMinuta, d: DadosMinuta): MinutaFisica {
  const identificacao = `Nome/Razão social: ${v(d.nome)}\nCPF/CNPJ: ${v(d.documento)}${d.rg.trim() ? `\nRG: ${d.rg.trim()}` : ''}\nFunção/Atividade: ${v(d.funcao)}\nUnidade: ${v(d.unidade)}`;
  const observacoes = d.observacoes.trim() ? `\n\nOBSERVAÇÕES: ${d.observacoes.trim()}` : '';
  const encerramento = `\n\nPor estar ciente e de acordo com as condições deste termo, assino a presente minuta em duas vias de igual teor.\n\n${assinatura(d.nome, d.funcao || 'Signatário(a)')}\n\n________________________________\nASAFE PEREIRA DA SILVA FELIX\nCoordenador de Comunicação e Mídia - CEM XXXIII`;

  if (tipo === 'integrante') return {
    titulo: TITULOS_MINUTA.integrante,
    data: d.dataIngresso,
    conteudo: `${identificacao}\n\nPelo presente termo, a pessoa identificada acima declara seu interesse e compromisso com a integração ao PROJETO CEMXXXIII NA MÍDIA, desenvolvido no Colégio Estadual Militarizado Fernando Grangeiro de Menezes.\n\n1. DO COMPROMISSO. Comprometo-me a participar das atividades do projeto com responsabilidade, assiduidade, respeito às orientações institucionais e zelo pelo patrimônio e pela imagem da unidade escolar.\n\n2. DA INTEGRAÇÃO. Comprometo-me a colaborar com a equipe, cumprir os combinados de cada atividade e comunicar previamente eventuais impedimentos.\n\n3. DA CONDUTA. Declaro estar ciente de que a participação poderá ser revista em caso de descumprimento das orientações ou de conduta incompatível com os princípios do projeto.\n\n4. DA VIGÊNCIA. Este compromisso passa a valer na data da assinatura e permanecerá vigente enquanto durar o vínculo com o projeto.${observacoes}${encerramento}`,
  };

  if (tipo === 'credenciamento') return {
    titulo: TITULOS_MINUTA.credenciamento,
    data: d.dataIngresso,
    conteudo: `${identificacao}\nEmpresa/Prestador: ${v(d.empresa || d.nome)}\nResponsável legal: ${v(d.responsavel)}\nObjeto do credenciamento: ${v(d.objeto)}\n\nPelo presente termo, a parte acima identificada solicita seu credenciamento junto ao Colégio Estadual Militarizado Fernando Grangeiro de Menezes para a finalidade descrita neste instrumento.\n\n1. DAS INFORMAÇÕES. Declaro que os dados e documentos apresentados são verdadeiros, completos e podem ser verificados pela unidade escolar.\n\n2. DO CREDENCIAMENTO. O credenciamento não gera obrigação de contratação, exclusividade, remuneração ou garantia de participação em atividades, estando sujeito à análise e às autorizações cabíveis.\n\n3. DAS OBRIGAÇÕES. Comprometo-me a manter os dados atualizados, observar as normas da unidade e apresentar os documentos complementares quando solicitados.\n\n4. DA VIGÊNCIA. ${v(d.vigencia) === '________________________________' ? 'O credenciamento terá vigência indicada no ato próprio ou até sua revisão ou cancelamento.' : d.vigencia.trim()}${observacoes}${encerramento}`,
  };

  if (tipo === 'voluntariado') return {
    titulo: TITULOS_MINUTA.voluntariado,
    data: d.dataIngresso,
    conteudo: `${identificacao}\nAção/Evento: ${v(d.evento)}\nLocal: ${v(d.local)}\nPeríodo: ${v(d.vigencia)}\n\nPelo presente termo, a pessoa acima identificada declara sua disponibilidade para atuar voluntariamente na ação ou evento indicado, por livre e espontânea vontade.\n\n1. DA ATUAÇÃO. O voluntário realizará as atividades combinadas com a equipe responsável, observando as orientações de organização, segurança e convivência.\n\n2. DA NATUREZA DO VÍNCULO. A atuação voluntária não gera vínculo empregatício, obrigação remuneratória ou promessa de contratação.\n\n3. DA RESPONSABILIDADE. O voluntário comunicará impedimentos e zelará pelos materiais, espaços e pessoas envolvidos na atividade.\n\n4. DO ENCERRAMENTO. O presente termo permanece vigente durante a ação ou evento informado, podendo a participação ser interrompida por qualquer das partes.${observacoes}${encerramento}`,
  };

  const titulo = d.objeto.trim().toUpperCase() || 'TERMO PERSONALIZADO';
  const campos = extras(d.camposExtras);
  return {
    titulo,
    data: d.dataIngresso,
    conteudo: `${identificacao}${campos ? `\n\nCAMPOS COMPLEMENTARES\n${campos}` : ''}\n\n${d.textoPersonalizado.trim() || 'Escreva aqui as condições, declarações e responsabilidades do termo personalizado.'}${observacoes}${encerramento}`,
  };
}
