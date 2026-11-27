import { describe, expect, it } from 'vitest';
import { dadosMinutaIniciais, montarMinuta, TITULOS_MINUTA } from '@/lib/minutas';

function dados() { return { ...dadosMinutaIniciais(), nome: 'Maria da Silva', documento: '123.456.789-00', funcao: 'Voluntária', dataIngresso: '2026-11-27' }; }

describe('minutas para assinatura física', () => {
  it('usa o título exato do termo de compromisso e integração', () => {
    const minuta = montarMinuta('integrante', dados());
    expect(minuta.titulo).toBe('TERMO DE COMPROMISSO E INTEGRAÇÃO - PROJETO CEMXXXIII NA MÍDIA');
    expect(minuta.conteudo).toContain('MARIA DA SILVA');
    expect(minuta.conteudo).toContain('ASAFE PEREIRA DA SILVA FELIX');
  });

  it('usa o título exato do credenciamento sem prometer contratação', () => {
    const minuta = montarMinuta('credenciamento', { ...dados(), empresa: 'Empresa Exemplo', responsavel: 'João Souza', objeto: 'Cobertura fotográfica' });
    expect(minuta.titulo).toBe(TITULOS_MINUTA.credenciamento);
    expect(minuta.conteudo).toContain('não gera obrigação de contratação');
    expect(minuta.conteudo).toContain('Cobertura fotográfica');
  });

  it('usa o título exato do voluntariado e identifica a ação', () => {
    const minuta = montarMinuta('voluntariado', { ...dados(), evento: 'Feira Cultural', local: 'Pátio central', vigencia: '27/11/2026' });
    expect(minuta.titulo).toBe('TERMO DE VOLUNTARIADO EM AÇÃO/EVENTO');
    expect(minuta.conteudo).toContain('Ação/Evento: Feira Cultural');
    expect(minuta.conteudo).toContain('Local: Pátio central');
  });

  it('permite título, campos e texto totalmente personalizados', () => {
    const minuta = montarMinuta('outros', { ...dados(), objeto: 'Termo de empréstimo de equipamento', camposExtras: [{ rotulo: 'Número de patrimônio', valor: 'CEM-0042' }], textoPersonalizado: 'O equipamento será devolvido nas mesmas condições.' });
    expect(minuta.titulo).toBe('TERMO DE EMPRÉSTIMO DE EQUIPAMENTO');
    expect(minuta.conteudo).toContain('Número de patrimônio: CEM-0042');
    expect(minuta.conteudo).toContain('O equipamento será devolvido nas mesmas condições.');
  });

  it('mantém as minutas fora da numeração oficial', () => {
    for (const tipo of ['integrante', 'credenciamento', 'voluntariado', 'outros'] as const) {
      const minuta = montarMinuta(tipo, dados());
      expect(minuta).not.toHaveProperty('numero');
      expect(minuta).not.toHaveProperty('ano');
    }
  });
});
