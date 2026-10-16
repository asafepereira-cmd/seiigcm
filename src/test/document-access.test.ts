import {describe,it,expect} from 'vitest';
import {podeEditarDocumento,podeComentarDocumento} from '@/lib/document-access';
import {modeloGravacao} from '@/lib/documento';
describe('painéis personalizados',()=>{
 it('modelo usa nome e função do titular',()=>{const d=modeloGravacao(1,{nome:'Pessoa titular',funcao:'Secretária'});expect(d.assinante).toBe('Pessoa titular');expect(d.cargo).toBe('Secretária');expect(d.de).toBe('Pessoa titular — Secretária');});
 it('emissor não edita documento de outra pessoa',()=>expect(podeEditarDocumento(false,'b',{criado_por:'a',status:'desenvolvendo',analise_admin:false})).toBe(false));
 it('emissor edita seu documento em desenvolvimento',()=>expect(podeEditarDocumento(false,'b',{criado_por:'b',status:'desenvolvendo',analise_admin:false})).toBe(true));
 it('documento submetido fica bloqueado durante análise',()=>expect(podeEditarDocumento(false,'b',{criado_por:'b',status:'desenvolvendo',analise_admin:true})).toBe(false));
 it('emissor não altera documento já assinado',()=>expect(podeEditarDocumento(false,'b',{criado_por:'b',status:'assinado',analise_admin:false})).toBe(false));
 it('somente desenvolvimento aceita comentários',()=>{expect(podeComentarDocumento('desenvolvendo')).toBe(true);expect(podeComentarDocumento('enviado')).toBe(false);expect(podeComentarDocumento('assinado')).toBe(false);});
});