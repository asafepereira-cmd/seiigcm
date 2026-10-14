ALTER TABLE public.documentos ADD COLUMN status text NOT NULL DEFAULT 'desenvolvendo' CHECK (status IN ('desenvolvendo', 'enviado', 'assinado'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;