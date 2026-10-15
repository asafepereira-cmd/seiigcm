ALTER TABLE public.documentos ADD COLUMN emitido_em timestamptz;

CREATE TABLE public.assinaturas_gestoras (
  gestora text PRIMARY KEY CHECK (gestora IN ('pedagogica','administrativa')),
  imagem text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinaturas_gestoras TO authenticated;
GRANT ALL ON public.assinaturas_gestoras TO service_role;
ALTER TABLE public.assinaturas_gestoras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all" ON public.assinaturas_gestoras FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.solicitacoes_assinatura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  gestora text NOT NULL CHECK (gestora IN ('pedagogica','administrativa')),
  token text NOT NULL UNIQUE,
  decisao text CHECK (decisao IN ('deferido','indeferido')),
  observacoes text NOT NULL DEFAULT '',
  assinado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (documento_id, gestora)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes_assinatura TO authenticated;
GRANT ALL ON public.solicitacoes_assinatura TO service_role;
ALTER TABLE public.solicitacoes_assinatura ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all" ON public.solicitacoes_assinatura FOR ALL TO authenticated USING (true) WITH CHECK (true);