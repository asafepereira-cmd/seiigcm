CREATE OR REPLACE FUNCTION public.documento_do_autor(_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.documentos WHERE id = _id AND criado_por = _uid) $$;
DROP POLICY IF EXISTS "emissor sols read" ON public.solicitacoes_assinatura;
CREATE POLICY "emissor sols read" ON public.solicitacoes_assinatura FOR SELECT TO authenticated
USING (public.documento_do_autor(documento_id, auth.uid()));
DROP POLICY IF EXISTS "destinatarios_emissor_read" ON public.documento_destinatarios;
CREATE POLICY "destinatarios_emissor_read" ON public.documento_destinatarios FOR SELECT TO authenticated
USING (public.documento_do_autor(documento_id, auth.uid()));