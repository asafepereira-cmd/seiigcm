CREATE TABLE public.modelos_unidade (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), nome text NOT NULL CHECK(length(trim(nome)) BETWEEN 1 AND 120), tipo text NOT NULL, conteudo jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.modelos_unidade TO authenticated; GRANT ALL ON public.modelos_unidade TO service_role;
ALTER TABLE public.modelos_unidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY modelos_proprios ON public.modelos_unidade TO authenticated USING(user_id=auth.uid() AND public.conta_ativa(auth.uid())) WITH CHECK(user_id=auth.uid() AND public.pode_emitir(auth.uid()));
CREATE TABLE public.blocos_assinatura (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), nome text NOT NULL CHECK(length(trim(nome)) BETWEEN 1 AND 120), itens jsonb NOT NULL CHECK(jsonb_typeof(itens)='array' AND jsonb_array_length(itens) BETWEEN 1 AND 50), assinado_em timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,DELETE ON public.blocos_assinatura TO authenticated; GRANT ALL ON public.blocos_assinatura TO service_role;
ALTER TABLE public.blocos_assinatura ENABLE ROW LEVEL SECURITY;
CREATE POLICY blocos_ler ON public.blocos_assinatura FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.conta_ativa(auth.uid()));
CREATE POLICY blocos_criar ON public.blocos_assinatura FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND public.permissao_painel(auth.uid(),'assinar') AND assinado_em IS NULL);
CREATE POLICY blocos_excluir ON public.blocos_assinatura FOR DELETE TO authenticated USING(user_id=auth.uid() AND assinado_em IS NULL);
CREATE OR REPLACE FUNCTION public.assinar_bloco(_bloco uuid,_autor uuid,_nome text,_funcao text,_cpf text,_decisao text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.blocos_assinatura; item jsonb; d public.documentos; r public.solicitacoes_assinatura; n integer:=0;
BEGIN
SELECT * INTO b FROM public.blocos_assinatura WHERE id=_bloco FOR UPDATE;
IF b.id IS NULL OR b.user_id IS DISTINCT FROM _autor OR b.assinado_em IS NOT NULL OR NOT public.permissao_painel(_autor,'assinar') THEN RAISE EXCEPTION 'Bloco indisponível'; END IF;
IF _decisao NOT IN ('deferido','indeferido','ciente') THEN RAISE EXCEPTION 'Decisão inválida'; END IF;
FOR item IN SELECT value FROM jsonb_array_elements(b.itens) ORDER BY value->>'documento_id' LOOP
SELECT * INTO d FROM public.documentos WHERE id=(item->>'documento_id')::uuid FOR UPDATE;
IF d.id IS NULL OR d.versao IS DISTINCT FROM (item->>'versao')::integer THEN RAISE EXCEPTION 'Documento alterado: recrie o bloco para revisar a nova versão'; END IF;
IF item->>'modo'='autor' THEN
PERFORM public.assinar_documento_autor(d.id,_autor,_nome,_funcao,_cpf);
ELSIF item->>'modo'='solicitacao' THEN
SELECT * INTO r FROM public.solicitacoes_assinatura WHERE id=(item->>'solicitacao_id')::uuid FOR UPDATE;
IF r.id IS NULL OR r.documento_id<>d.id OR r.versao<>d.versao OR r.assinado_em IS NOT NULL OR NOT (r.gestora='user:'||_autor::text OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_autor AND role::text=r.gestora AND role::text IN ('pedagogica','administrativa'))) THEN RAISE EXCEPTION 'Solicitação não atribuída à conta'; END IF;
PERFORM public.assinar_identificado(r.token,CASE WHEN r.finalidade='ciencia' THEN 'ciente' ELSE _decisao END,'',_nome,_funcao,_cpf);
ELSE RAISE EXCEPTION 'Item inválido'; END IF;
n:=n+1;
END LOOP;
UPDATE public.blocos_assinatura SET assinado_em=now() WHERE id=b.id;
RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.assinar_bloco(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assinar_bloco(uuid,uuid,text,text,text,text) TO service_role;