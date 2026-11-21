import { describe, it, expect } from 'vitest';
import { precisaSalvar, signatariosUltimaVersao } from '../lib/document-editor';

const row = (gestora: string, versao: number) => ({gestora,versao,signatario_nome:'Pessoa',signatario_funcao:'Função',finalidade:'ciencia'});
describe('atualização do editor', () => {
  it('recupera os signatários da versão 1 quando a versão 2 só tem assinatura do emissor', () => {
    const selected = signatariosUltimaVersao([row('user:glaucia',1),row('extra:adriana',1),row('emissor:asafe',2)]);
    expect(selected.map(r=>r.gestora)).toEqual(['user:glaucia','extra:adriana']);
  });
  it('usa a seleção mais recente em vez de unir signatários removidos', () => {
    expect(signatariosUltimaVersao([row('user:a',1),row('user:b',2)]).map(r=>r.gestora)).toEqual(['user:b']);
  });
  it('não salva novamente conteúdo inalterado já assinado antes de enviar', () => {
    const document = {numero:15,corpo:'Texto assinado'};
    expect(precisaSalvar(document,JSON.stringify(document),'oficio15')).toBe(false);
  });
  it('exige salvar texto alterado como nova versão', () => {
    expect(precisaSalvar({numero:15,corpo:'Texto novo'},JSON.stringify({numero:15,corpo:'Texto assinado'}),'oficio15')).toBe(true);
  });
});