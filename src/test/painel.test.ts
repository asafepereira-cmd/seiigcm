import {describe,it,expect} from 'vitest';
import {ordenarPainel,todasAssinadas} from '@/lib/painel';
describe('painel de assinaturas',()=>{
 it('prioridade alta antes de normal',()=>expect(ordenarPainel([{prioridade:'normal',prazo:'2026-01-01'},{prioridade:'alta',prazo:'2026-12-01'}])[0]?.prioridade).toBe('alta'));
 it('mesma prioridade ordena pelo prazo mais próximo',()=>expect(ordenarPainel([{prioridade:'alta',prazo:null},{prioridade:'alta',prazo:'2026-11-01'},{prioridade:'alta',prazo:'2026-10-20'}])[0]?.prazo).toBe('2026-10-20'));
 it('as duas devem assinar independentemente',()=>{expect(todasAssinadas([{assinado_em:'2026-10-16'},{assinado_em:null}])).toBe(false);expect(todasAssinadas([{assinado_em:'2026-10-16'},{assinado_em:'2026-10-17'}])).toBe(true);});
 it('uma única assinatura solicitada é suficiente',()=>expect(todasAssinadas([{assinado_em:'2026-10-16'}])).toBe(true));
});
