import { describe, it, expect } from 'vitest';
import { contatoAdministrador, profileNameInput } from '@/lib/profile';
import { identificacaoDocumento, modeloGravacao } from '@/lib/documento';
describe('perfil e edital',()=>{
  it('preenche o contato com nome e setor no número solicitado',()=>{
    const url=new URL(contatoAdministrador('Asafe Pereira','CCM'));
    expect(url.pathname).toBe('/5595991120610');
    expect(url.searchParams.get('text')).toBe('Olá! Gostaria de falar com o desenvolvedor do SEII, sou Asafe Pereira — CCM.');
  });
  it('descarta permissões e identificação de outra conta do perfil',()=>{
    expect(profileNameInput.parse({nome:'Maria Silva',id:'outro',pode_emitir:true})).toEqual({nome:'Maria Silva'});
  });
  it('edital usa classificação livre com sequência e sigla',()=>{
    expect(identificacaoDocumento({...modeloGravacao(1),tipo:'Edital',ano:2026,sigla:'CEMXXXIII/GCM',editalQualificador:'Interno'})).toBe('EDITAL INTERNO 001/2026 - CEMXXXIII/GCM');
  });
});