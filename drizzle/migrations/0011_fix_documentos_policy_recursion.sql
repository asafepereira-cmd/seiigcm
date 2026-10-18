CREATE OR REPLACE FUNCTION public.documento_existe(_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.documentos WHERE id = _id) $$;

REVOKE ALL ON FUNCTION public.documento_existe(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.documento_existe(uuid) TO authenticated;

DROP POLICY IF EXISTS "comentarios_read" ON public.documento_comentarios;
CREATE POLICY "comentarios_read" ON public.documento_comentarios
  FOR SELECT TO authenticated
  USING (public.documento_existe(documento_id));

DROP POLICY IF EXISTS "registros_documento" ON public.solicitacoes_assinatura;
CREATE POLICY "registros_documento" ON public.solicitacoes_assinatura
  FOR SELECT TO authenticated
  USING (public.documento_existe(documento_id));

DROP POLICY IF EXISTS "versoes_read" ON public.documento_versoes;
CREATE POLICY "versoes_read" ON public.documento_versoes
  FOR SELECT TO authenticated
  USING (public.documento_existe(documento_id));