DROP POLICY IF EXISTS consulta_documentos ON public.documentos;
DROP POLICY IF EXISTS emissor_read ON public.documentos;
DROP POLICY IF EXISTS "emissor sols read" ON public.solicitacoes_assinatura;
CREATE POLICY "emissor sols read" ON public.solicitacoes_assinatura FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.documentos d WHERE d.id = documento_id AND d.criado_por = auth.uid()));
CREATE OR REPLACE FUNCTION public.acesso_documento(_id uuid, _uid uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT public.conta_ativa(_uid) AND EXISTS(SELECT 1 FROM public.documentos d WHERE d.id=_id AND (public.has_role(_uid,'admin') OR d.criado_por=_uid OR EXISTS(SELECT 1 FROM public.documento_destinatarios x WHERE x.documento_id=d.id AND x.user_id=_uid) OR EXISTS(SELECT 1 FROM public.solicitacoes_assinatura s WHERE s.documento_id=d.id AND (s.gestora='user:'||_uid::text OR EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=_uid AND r.role::text=s.gestora))) OR (d.processo_id IS NOT NULL AND public.acesso_processo(d.processo_id,_uid)))) $function$;