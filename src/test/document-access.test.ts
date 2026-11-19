import {describe,it,expect} from 'vitest';
import {podeEditarDocumento,podeComentarDocumento,podeAssinarComoEmissor} from '@/lib/document-access';
import {modeloGravacao} from '@/lib/documento';
describe('painéis personalizados',()=>{
 it('assinatura de emissor exige autoria mesmo com permissão',()=>{expect(podeAssinarComoEmissor('a','b',true)).toBe(false);expect(podeAssinarComoEmissor('a','a',true)).toBe(true);});
 it('assinatura de emissor exige permissão da conta',()=>expect(podeAssinarComoEmissor('a','a',false)).toBe(false));
 it('modelo usa nome e função do titular',()=>{const d=modeloGravacao(1,{nome:'Pessoa titular',funcao:'Secretária'});expect(d.assinante).toBe('Pessoa titular');expect(d.cargo).toBe('Secretária');expect(d.de).toBe('Pessoa titular — Secretária');});
 it('emissor não edita documento de outra pessoa',()=>expect(podeEditarDocumento(false,'b',{criado_por:'a',status:'desenvolvendo',analise_admin:false})).toBe(false));
 it('emissor edita seu documento em desenvolvimento',()=>expect(podeEditarDocumento(false,'b',{criado_por:'b',status:'desenvolvendo',analise_admin:false})).toBe(true));
 it('análise antiga não bloqueia edição do próprio documento',()=>expect(podeEditarDocumento(false,'b',{criado_por:'b',status:'desenvolvendo',analise_admin:true})).toBe(true));
 it('emissor reedita seu documento já assinado (nova versão exige novas assinaturas)',()=>expect(podeEditarDocumento(false,'b',{criado_por:'b',status:'assinado',analise_admin:false})).toBe(true));
 it('somente desenvolvimento aceita comentários',()=>{expect(podeComentarDocumento('desenvolvendo')).toBe(true);expect(podeComentarDocumento('enviado')).toBe(false);expect(podeComentarDocumento('assinado')).toBe(false);});
});