CREATE OR REPLACE FUNCTION public.documento_existe(_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.documentos WHERE id = _id)
$$;