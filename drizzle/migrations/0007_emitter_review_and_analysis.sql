ALTER TABLE public.documentos ADD COLUMN analise_admin boolean NOT NULL DEFAULT false;
ALTER TABLE public.documentos ADD COLUMN enviado_analise_em timestamptz;
ALTER TABLE public.solicitacoes_assinatura ADD COLUMN aberto_em timestamptz;
ALTER TABLE public.solicitacoes_assinatura ADD COLUMN em_analise_em timestamptz;
CREATE TABLE public.documento_comentarios (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), documento_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE, autor_id uuid NOT NULL DEFAULT auth.uid(), texto text NOT NULL CHECK (length(trim(texto)) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT ON public.documento_comentarios TO authenticated;
GRANT ALL ON public.documento_comentarios TO service_role;
ALTER TABLE public.documento_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY comentarios_read ON public.documento_comentarios FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.documentos d WHERE d.id=documento_id));
CREATE POLICY comentarios_insert ON public.documento_comentarios FOR INSERT TO authenticated WITH CHECK (autor_id=auth.uid() AND public.pode_emitir(auth.uid()) AND EXISTS (SELECT 1 FROM public.documentos d WHERE d.id=documento_id AND d.status='desenvolvendo'));
DROP POLICY "emissor docs" ON public.documentos;
CREATE POLICY emissor_read ON public.documentos FOR SELECT TO authenticated USING (public.pode_emitir(auth.uid()) AND (criado_por=auth.uid() OR status IN ('desenvolvendo','assinado')));
CREATE POLICY emissor_insert ON public.documentos FOR INSERT TO authenticated WITH CHECK (public.pode_emitir(auth.uid()) AND criado_por=auth.uid() AND status='desenvolvendo' AND emitido_em IS NULL AND NOT analise_admin);
CREATE POLICY emissor_update ON public.documentos FOR UPDATE TO authenticated USING (public.pode_emitir(auth.uid()) AND criado_por=auth.uid() AND status='desenvolvendo' AND NOT analise_admin AND emitido_em IS NULL) WITH CHECK (criado_por=auth.uid() AND status='desenvolvendo' AND NOT analise_admin AND emitido_em IS NULL);
CREATE POLICY emissor_delete ON public.documentos FOR DELETE TO authenticated USING (public.pode_emitir(auth.uid()) AND criado_por=auth.uid() AND status='desenvolvendo' AND NOT analise_admin AND emitido_em IS NULL);
CREATE OR REPLACE FUNCTION public.proteger_documento_emissor() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
IF current_user IN ('postgres','service_role','supabase_admin') OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
IF TG_OP='INSERT' THEN NEW.criado_por:=auth.uid(); IF NEW.status<>'desenvolvendo' OR NEW.emitido_em IS NOT NULL OR NEW.analise_admin THEN RAISE EXCEPTION 'Estado inválido'; END IF;
ELSE
IF NEW.criado_por IS DISTINCT FROM OLD.criado_por OR NEW.status IS DISTINCT FROM OLD.status OR NEW.emitido_em IS DISTINCT FROM OLD.emitido_em OR NEW.analise_admin IS DISTINCT FROM OLD.analise_admin OR NEW.enviado_analise_em IS DISTINCT FROM OLD.enviado_analise_em THEN RAISE EXCEPTION 'Alteração restrita'; END IF;
END IF; RETURN NEW; END $$;
CREATE TRIGGER proteger_documento_emissor BEFORE INSERT OR UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.proteger_documento_emissor();
CREATE OR REPLACE FUNCTION public.submeter_analise(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NOT public.pode_emitir(auth.uid()) THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
UPDATE public.documentos SET analise_admin=true,enviado_analise_em=now(),updated_at=now() WHERE id=_id AND criado_por=auth.uid() AND status='desenvolvendo' AND emitido_em IS NULL AND NOT analise_admin;
IF NOT FOUND THEN RAISE EXCEPTION 'Documento não disponível'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.submeter_analise(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.submeter_analise(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.devolver_analise(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
UPDATE public.documentos SET analise_admin=false,updated_at=now() WHERE id=_id AND analise_admin AND emitido_em IS NULL;
IF NOT FOUND THEN RAISE EXCEPTION 'Documento não disponível'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.devolver_analise(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.devolver_analise(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.marcar_analise(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
UPDATE public.solicitacoes_assinatura s SET aberto_em=coalesce(aberto_em,now()),em_analise_em=coalesce(em_analise_em,now()) WHERE s.id=_id AND s.assinado_em IS NULL AND (s.gestora='user:'||auth.uid()::text OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.role::text=s.gestora));
IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não disponível'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.marcar_analise(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.marcar_analise(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.enviar_documento(_id uuid, _gestoras text[], _extras jsonb, _prioridade text, _prazo date, _termo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.documentos; g text; e jsonb; chave text;
BEGIN
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Somente o administrador pode encaminhar para assinaturas'; END IF;
SELECT * INTO d FROM public.documentos WHERE id=_id FOR UPDATE;
IF d.id IS NULL OR d.emitido_em IS NOT NULL THEN RAISE EXCEPTION 'Documento não disponível para envio'; END IF;
IF _prioridade NOT IN ('alta','normal') OR cardinality(_gestoras)>2 OR jsonb_array_length(_extras)>10 OR (cardinality(_gestoras)<1 AND jsonb_array_length(_extras)<1) THEN RAISE EXCEPTION 'Envio inválido'; END IF;
FOR g IN SELECT DISTINCT unnest(_gestoras) LOOP
IF g NOT IN ('pedagogica','administrativa') THEN RAISE EXCEPTION 'Gestora inválida'; END IF;
INSERT INTO public.solicitacoes_assinatura(documento_id,gestora,token,termo) VALUES (_id,g,replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),_termo);
END LOOP;
FOR e IN SELECT * FROM jsonb_array_elements(_extras) LOOP
IF length(trim(coalesce(e->>'nome','')))<1 OR length(trim(coalesce(e->>'funcao','')))<1 OR length(e->>'nome')>200 OR length(e->>'funcao')>200 THEN RAISE EXCEPTION 'Signatário inválido'; END IF;
IF coalesce(e->>'user_id','')<>'' THEN
IF NOT EXISTS(SELECT 1 FROM public.paineis WHERE user_id::text=e->>'user_id') THEN RAISE EXCEPTION 'Painel inválido'; END IF;
chave:='user:'||(e->>'user_id');
ELSE chave:='extra:'||gen_random_uuid()::text; END IF;
INSERT INTO public.solicitacoes_assinatura(documento_id,gestora,token,signatario_nome,signatario_funcao,termo) VALUES (_id,chave,replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),trim(e->>'nome'),trim(e->>'funcao'),_termo);
END LOOP;
UPDATE public.documentos SET analise_admin=false,status='enviado',emitido_em=now(),updated_at=now(),prioridade=_prioridade,prazo=_prazo,dados=CASE WHEN cardinality(_gestoras)=0 THEN dados ELSE jsonb_set(dados,'{despacho}',to_jsonb(CASE WHEN cardinality(_gestoras)=2 THEN 'ambas' ELSE _gestoras[1] END)) END WHERE id=_id;
END $$;
REVOKE ALL ON FUNCTION public.enviar_documento(uuid,text[],jsonb,text,date,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.enviar_documento(uuid,text[],jsonb,text,date,text) TO authenticated;