CREATE OR REPLACE FUNCTION public.proteger_documento_emissor() RETURNS trigger LANGUAGE plpgsql SET search_path TO public AS $$ BEGIN
IF TG_OP='UPDATE' AND OLD.emitido_em IS NOT NULL AND (NEW.dados IS DISTINCT FROM OLD.dados OR NEW.numero<>OLD.numero OR NEW.ano<>OLD.ano OR NEW.tipo<>OLD.tipo OR NEW.assunto<>OLD.assunto OR NEW.processo_id IS DISTINCT FROM OLD.processo_id) THEN RAISE EXCEPTION 'Crie uma nova versão para editar documento emitido'; END IF;
IF NEW.processo_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.processos WHERE id=NEW.processo_id AND aberto_em IS NOT NULL) THEN RAISE EXCEPTION 'Processo não aberto'; END IF;
IF current_user IN ('postgres','service_role','supabase_admin') THEN RETURN NEW; END IF;
IF TG_OP='UPDATE' AND (NEW.numero<>OLD.numero OR NEW.ano<>OLD.ano OR NEW.tipo<>OLD.tipo) THEN RAISE EXCEPTION 'Altere a numeração pelo salvamento do documento'; END IF;
IF public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
IF TG_OP='INSERT' THEN NEW.criado_por:=auth.uid(); IF NEW.status<>'desenvolvendo' OR NEW.emitido_em IS NOT NULL OR NEW.analise_admin THEN RAISE EXCEPTION 'Estado inválido'; END IF;
ELSE IF NEW.criado_por IS DISTINCT FROM OLD.criado_por OR NEW.status IS DISTINCT FROM OLD.status OR NEW.emitido_em IS DISTINCT FROM OLD.emitido_em OR NEW.analise_admin IS DISTINCT FROM OLD.analise_admin OR NEW.versao<>OLD.versao OR NEW.enviado_analise_em IS DISTINCT FROM OLD.enviado_analise_em THEN RAISE EXCEPTION 'Alteração restrita'; END IF; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.salvar_documento(_id uuid,_dados jsonb,_processo uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$ DECLARE d public.documentos; n integer; a integer; t text; resultado uuid; p public.processos; BEGIN
IF NOT public.pode_emitir(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para emissão'; END IF;
n:=(_dados->>'numero')::integer; a:=(_dados->>'ano')::integer; t:=_dados->>'tipo';
IF n IS NULL OR n<1 OR a IS NULL OR a<1 OR t IS NULL OR trim(t)='' THEN RAISE EXCEPTION 'Informe numeração e ano válidos'; END IF;
PERFORM pg_advisory_xact_lock(873420,a);
IF EXISTS(SELECT 1 FROM public.documentos WHERE numero=n AND ano=a AND upper(tipo)=upper(t) AND id IS DISTINCT FROM _id) THEN RAISE EXCEPTION 'Este número já está utilizado neste tipo e ano. Escolha outro número.'; END IF;
IF _id IS NOT NULL THEN
SELECT * INTO d FROM public.documentos WHERE id=_id FOR UPDATE;
IF d.id IS NULL OR (NOT public.has_role(auth.uid(),'admin') AND (d.criado_por IS DISTINCT FROM auth.uid() OR d.analise_admin)) OR (d.processo_id IS NOT NULL AND NOT public.acesso_processo(d.processo_id,auth.uid())) THEN RAISE EXCEPTION 'Documento não disponível'; END IF;
_processo:=d.processo_id; t:=d.tipo; a:=d.ano;
END IF;
IF _processo IS NOT NULL THEN
SELECT * INTO p FROM public.processos WHERE id=_processo;
IF p.id IS NULL OR NOT public.acesso_processo(_processo,auth.uid()) OR p.aberto_em IS NULL THEN RAISE EXCEPTION 'Processo não disponível'; END IF;
_dados:=_dados||jsonb_build_object('processo',jsonb_build_object('numero',p.numero,'ano',extract(year FROM p.created_at AT TIME ZONE 'America/Boa_Vista')::integer,'tema',p.tema));
ELSE _dados:=_dados-'processo'; END IF;
_dados:=_dados||jsonb_build_object('numero',n,'ano',a,'tipo',t);
IF _id IS NULL THEN
INSERT INTO public.documentos(tipo,numero,ano,assunto,dados,criado_por,processo_id) VALUES(t,n,a,coalesce(_dados->>'assunto',''),_dados,auth.uid(),_processo) RETURNING id INTO resultado; RETURN resultado;
END IF;
IF d.emitido_em IS NOT NULL THEN
INSERT INTO public.documento_versoes(documento_id,versao,dados,emitido_em,status,assinaturas) SELECT d.id,d.versao,d.dados,d.emitido_em,d.status,coalesce(jsonb_agg(to_jsonb(s)) FILTER(WHERE s.id IS NOT NULL),'[]'::jsonb) FROM public.solicitacoes_assinatura s WHERE s.documento_id=d.id AND s.versao=d.versao;
UPDATE public.documentos SET emitido_em=NULL,status='desenvolvendo',analise_admin=false,enviado_analise_em=NULL,versao=versao+1 WHERE id=d.id;
END IF;
UPDATE public.documentos SET numero=n,dados=_dados,assunto=coalesce(_dados->>'assunto',''),updated_at=now() WHERE id=d.id; RETURN d.id; END $$;
REVOKE ALL ON FUNCTION public.salvar_documento(uuid,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.salvar_documento(uuid,jsonb,uuid) TO authenticated;
GRANT DELETE ON public.processo_anexos TO authenticated;
CREATE POLICY anexos_delete ON public.processo_anexos FOR DELETE TO authenticated USING (public.conta_ativa(auth.uid()) AND public.pode_emitir(auth.uid()) AND public.acesso_processo(processo_id,auth.uid()) AND (public.has_role(auth.uid(),'admin') OR criado_por=auth.uid()));
CREATE OR REPLACE FUNCTION public.excluir_anexo_processo(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$ DECLARE a public.processo_anexos; BEGIN
SELECT * INTO a FROM public.processo_anexos WHERE id=_id FOR UPDATE;
IF a.id IS NULL OR NOT public.conta_ativa(auth.uid()) OR NOT public.pode_emitir(auth.uid()) OR NOT public.acesso_processo(a.processo_id,auth.uid()) OR NOT (public.has_role(auth.uid(),'admin') OR a.criado_por=auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para excluir'; END IF;
DELETE FROM public.processo_anexos WHERE id=_id; END $$;
REVOKE ALL ON FUNCTION public.excluir_anexo_processo(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.excluir_anexo_processo(uuid) TO authenticated;