CREATE OR REPLACE FUNCTION public.assinar_documento_autor(_id uuid,_autor uuid,_nome text,_funcao text,_cpf text DEFAULT '') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE d public.documentos; BEGIN
SELECT * INTO d FROM public.documentos WHERE id=_id FOR UPDATE;
IF d.id IS NULL OR d.criado_por IS DISTINCT FROM _autor OR NOT public.pode_emitir(_autor) OR NOT public.permissao_painel(_autor,'assinar') THEN RAISE EXCEPTION 'Assinatura não autorizada'; END IF;
IF length(trim(_nome))=0 OR length(trim(_funcao))=0 THEN RAISE EXCEPTION 'Informe nome e função'; END IF;
IF EXISTS(SELECT 1 FROM public.solicitacoes_assinatura WHERE documento_id=_id AND versao=d.versao AND gestora='emissor:'||_autor::text) THEN RAISE EXCEPTION 'Esta versão já foi assinada pelo emissor'; END IF;
INSERT INTO public.solicitacoes_assinatura(documento_id,gestora,token,signatario_nome,signatario_funcao,versao,finalidade,decisao,assinado_em,observacoes) VALUES(_id,'emissor:'||_autor::text,replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),trim(_nome),trim(_funcao),d.versao,'ciencia','ciente',now(),'');
UPDATE public.documentos SET emitido_em=coalesce(emitido_em,now()),status=CASE WHEN EXISTS(SELECT 1 FROM public.solicitacoes_assinatura WHERE documento_id=_id AND versao=d.versao AND assinado_em IS NULL) THEN 'enviado' ELSE 'assinado' END,updated_at=now() WHERE id=_id;
END $$;
REVOKE ALL ON FUNCTION public.assinar_documento_autor(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assinar_documento_autor(uuid,uuid,text,text,text) TO service_role;
DO $$ DECLARE f text; BEGIN
SELECT pg_get_functiondef('public.salvar_documento(uuid,jsonb,uuid)'::regprocedure) INTO f;
f:=replace(f,'IF d.emitido_em IS NOT NULL AND d.status=''assinado'' THEN','IF d.emitido_em IS NOT NULL AND d.status=''assinado'' AND NOT EXISTS(SELECT 1 FROM public.solicitacoes_assinatura WHERE documento_id=d.id AND versao=d.versao AND gestora LIKE ''emissor:%'') THEN');
EXECUTE f; END $$;