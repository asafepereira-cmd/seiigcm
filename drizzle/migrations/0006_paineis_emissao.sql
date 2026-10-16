CREATE TABLE public.paineis (user_id uuid PRIMARY KEY, nome text NOT NULL, funcao text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.paineis TO authenticated;
GRANT ALL ON public.paineis TO service_role;
ALTER TABLE public.paineis ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.pode_emitir(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_uid AND role IN ('admin','emissor')) $$;
CREATE POLICY "auth read paineis" ON public.paineis FOR SELECT TO authenticated USING (true);
CREATE POLICY "emissor docs" ON public.documentos FOR ALL TO authenticated USING (public.pode_emitir(auth.uid())) WITH CHECK (public.pode_emitir(auth.uid()));
CREATE POLICY "emissor sols read" ON public.solicitacoes_assinatura FOR SELECT TO authenticated USING (public.pode_emitir(auth.uid()));
CREATE POLICY "user read own sols" ON public.solicitacoes_assinatura FOR SELECT TO authenticated USING (gestora = 'user:' || auth.uid()::text);
CREATE POLICY "emissor read assinaturas" ON public.assinaturas_gestoras FOR SELECT TO authenticated USING (public.pode_emitir(auth.uid()));
ALTER TABLE public.assinaturas_gestoras DROP CONSTRAINT assinaturas_gestoras_gestora_check;
ALTER TABLE public.assinaturas_gestoras ADD CONSTRAINT assinaturas_gestoras_gestora_check CHECK (gestora IN ('pedagogica','administrativa','admin'));
ALTER TABLE public.solicitacoes_assinatura DROP CONSTRAINT solicitacoes_assinatura_gestora_check;
ALTER TABLE public.solicitacoes_assinatura ADD CONSTRAINT solicitacoes_assinatura_gestora_check CHECK (gestora IN ('pedagogica','administrativa') OR ((gestora LIKE 'extra:%' OR gestora LIKE 'user:%') AND signatario_nome IS NOT NULL AND signatario_funcao IS NOT NULL));
CREATE OR REPLACE FUNCTION public.enviar_documento(_id uuid, _gestoras text[], _extras jsonb, _prioridade text, _prazo date, _termo text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE d public.documentos; g text; e jsonb; chave text;
BEGIN
IF NOT public.pode_emitir(auth.uid()) THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
SELECT * INTO d FROM public.documentos WHERE id = _id FOR UPDATE;
IF d.id IS NULL OR d.emitido_em IS NOT NULL THEN RAISE EXCEPTION 'Documento não disponível para envio'; END IF;
IF _prioridade NOT IN ('alta','normal') OR cardinality(_gestoras) > 2 OR jsonb_array_length(_extras) > 10 OR (cardinality(_gestoras) < 1 AND jsonb_array_length(_extras) < 1) THEN RAISE EXCEPTION 'Envio inválido'; END IF;
FOR g IN SELECT DISTINCT unnest(_gestoras) LOOP
IF g NOT IN ('pedagogica','administrativa') THEN RAISE EXCEPTION 'Gestora inválida'; END IF;
INSERT INTO public.solicitacoes_assinatura(documento_id,gestora,token,termo) VALUES (_id,g,replace(gen_random_uuid()::text || gen_random_uuid()::text,'-',''),_termo);
END LOOP;
FOR e IN SELECT * FROM jsonb_array_elements(_extras) LOOP
IF length(trim(coalesce(e->>'nome',''))) < 1 OR length(trim(coalesce(e->>'funcao',''))) < 1 OR length(e->>'nome') > 200 OR length(e->>'funcao') > 200 THEN RAISE EXCEPTION 'Signatário inválido'; END IF;
IF coalesce(e->>'user_id','') <> '' THEN
  IF NOT EXISTS(SELECT 1 FROM public.paineis WHERE user_id::text = e->>'user_id') THEN RAISE EXCEPTION 'Painel inválido'; END IF;
  chave := 'user:' || (e->>'user_id');
ELSE chave := 'extra:' || gen_random_uuid()::text; END IF;
INSERT INTO public.solicitacoes_assinatura(documento_id,gestora,token,signatario_nome,signatario_funcao,termo) VALUES (_id,chave,replace(gen_random_uuid()::text || gen_random_uuid()::text,'-',''),trim(e->>'nome'),trim(e->>'funcao'),_termo);
END LOOP;
UPDATE public.documentos SET status='enviado',emitido_em=now(),updated_at=now(),prioridade=_prioridade,prazo=_prazo,dados=CASE WHEN cardinality(_gestoras)=0 THEN dados ELSE jsonb_set(dados,'{despacho}',to_jsonb(CASE WHEN cardinality(_gestoras)=2 THEN 'ambas' ELSE _gestoras[1] END)) END WHERE id=_id;
END $function$;