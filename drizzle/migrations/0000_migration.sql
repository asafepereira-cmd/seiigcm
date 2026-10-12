CREATE TABLE public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'OFÍCIO',
  numero integer NOT NULL,
  ano integer NOT NULL,
  assunto text NOT NULL DEFAULT '',
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read" ON public.documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert" ON public.documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update" ON public.documentos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete" ON public.documentos FOR DELETE TO authenticated USING (true);