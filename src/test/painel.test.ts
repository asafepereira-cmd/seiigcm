import {describe,it,expect} from 'vitest';
import {ordenarPainel,todasAssinadas,solicitacoesDoUsuario} from '@/lib/painel';
describe('painel de assinaturas',()=>{
 it('Ana Beatriz recebe a solicitação individual mesmo tendo apenas papel emissor',()=>{
  const userId='b1f2c8cd-e2e6-4cdf-8464-d1be92ec5eb8';
  const propria={id:'8bc83559-86c4-4dc5-ac3c-534f0d357f89',gestora:'user:'+userId};
  expect(solicitacoesDoUsuario([propria,{id:'outra',gestora:'user:outra-pessoa'},{id:'gestora',gestora:'administrativa'}],['emissor'],userId)).toEqual([propria]);
 });
 it('prioridade alta antes de normal',()=>expect(ordenarPainel([{prioridade:'normal',prazo:'2026-01-01'},{prioridade:'alta',prazo:'2026-12-01'}])[0]?.prioridade).toBe('alta'));
 it('mesma prioridade ordena pelo prazo mais próximo',()=>expect(ordenarPainel([{prioridade:'alta',prazo:null},{prioridade:'alta',prazo:'2026-11-01'},{prioridade:'alta',prazo:'2026-10-20'}])[0]?.prazo).toBe('2026-10-20'));
 it('as duas devem assinar independentemente',()=>{expect(todasAssinadas([{assinado_em:'2026-10-16'},{assinado_em:null}])).toBe(false);expect(todasAssinadas([{assinado_em:'2026-10-16'},{assinado_em:'2026-10-17'}])).toBe(true);});
 it('uma única assinatura solicitada é suficiente',()=>expect(todasAssinadas([{assinado_em:'2026-10-16'}])).toBe(true));
});
