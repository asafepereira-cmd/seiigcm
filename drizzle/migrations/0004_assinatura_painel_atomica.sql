ALTER TABLE public.solicitacoes_assinatura DROP CONSTRAINT solicitacoes_assinatura_gestora_check;
ALTER TABLE public.solicitacoes_assinatura ADD CONSTRAINT solicitacoes_assinatura_gestora_check CHECK (gestora IN ('pedagogica','administrativa') OR (gestora LIKE 'extra:%' AND signatario_nome IS NOT NULL AND signatario_funcao IS NOT NULL));
CREATE OR REPLACE FUNCTION public.enviar_documento(_id uuid, _gestoras text[], _extras jsonb, _prioridade text, _prazo date, _termo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.documentos; g text; e jsonb;
BEGIN
IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
SELECT * INTO d FROM public.documentos WHERE id = _id FOR UPDATE;
IF d.id IS NULL OR d.emitido_em IS NOT NULL THEN RAISE EXCEPTION 'Documento não disponível para envio'; END IF;
IF _prioridade NOT IN ('alta','normal') OR cardinality(_gestoras) < 1 OR cardinality(_gestoras) > 2 OR jsonb_array_length(_extras) > 10 THEN RAISE EXCEPTION 'Envio inválido'; END IF;
FOR g IN SELECT DISTINCT unnest(_gestoras) LOOP
IF g NOT IN ('pedagogica','administrativa') THEN RAISE EXCEPTION 'Gestora inválida'; END IF;
INSERT INTO public.solicitacoes_assinatura(documento_id,gestora,token,termo) VALUES (_id,g,replace(gen_random_uuid()::text || gen_random_uuid()::text,'-',''),_termo);
END LOOP;
FOR e IN SELECT * FROM jsonb_array_elements(_extras) LOOP
IF length(trim(e->>'nome')) < 1 OR NOT EXISTS(SELECT 1 FROM public.funcoes_predefinidas WHERE nome = e->>'funcao') THEN RAISE EXCEPTION 'Signatário inválido'; END IF;
INSERT INTO public.solicitacoes_assinatura(documento_id,gestora,token,signatario_nome,signatario_funcao,termo) VALUES (_id,'extra:' || gen_random_uuid()::text,replace(gen_random_uuid()::text || gen_random_uuid()::text,'-',''),trim(e->>'nome'),e->>'funcao',_termo);
END LOOP;
UPDATE public.documentos SET status='enviado',emitido_em=now(),updated_at=now(),prioridade=_prioridade,prazo=_prazo,dados=jsonb_set(dados,'{despacho}',to_jsonb(CASE WHEN cardinality(_gestoras)=2 THEN 'ambas' ELSE _gestoras[1] END)) WHERE id=_id;
END $$;
REVOKE ALL ON FUNCTION public.enviar_documento(uuid,text[],jsonb,text,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enviar_documento(uuid,text[],jsonb,text,date,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.registrar_assinatura(_token text, _decisao text, _observacoes text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.solicitacoes_assinatura;
BEGIN
SELECT * INTO r FROM public.solicitacoes_assinatura WHERE token=_token;
IF r.id IS NULL THEN RAISE EXCEPTION 'Link inválido'; END IF;
PERFORM 1 FROM public.documentos WHERE id=r.documento_id AND emitido_em IS NOT NULL FOR UPDATE;
IF NOT FOUND OR _decisao NOT IN ('deferido','indeferido') OR length(_observacoes)>600 THEN RAISE EXCEPTION 'Assinatura inválida'; END IF;
UPDATE public.solicitacoes_assinatura SET decisao=_decisao,observacoes=trim(_observacoes),assinado_em=now() WHERE id=r.id AND assinado_em IS NULL;
IF NOT FOUND THEN RAISE EXCEPTION 'Documento já assinado'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.solicitacoes_assinatura WHERE documento_id=r.documento_id AND assinado_em IS NULL) THEN UPDATE public.documentos SET status='assinado',updated_at=now() WHERE id=r.documento_id; END IF;
END $$;
REVOKE ALL ON FUNCTION public.registrar_assinatura(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_assinatura(text,text,text) TO service_role;