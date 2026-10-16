CREATE TYPE public.app_role AS ENUM ('admin', 'pedagogica', 'administrativa');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- A conta compartilhada existente vira admin (backfill da mudança aditiva).
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.documentos
  ADD COLUMN prioridade TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN prazo DATE;

ALTER TABLE public.solicitacoes_assinatura
  ADD COLUMN signatario_nome TEXT,
  ADD COLUMN signatario_funcao TEXT,
  ADD COLUMN termo TEXT NOT NULL DEFAULT '';

CREATE TABLE public.funcoes_predefinidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.funcoes_predefinidas TO authenticated;
GRANT ALL ON public.funcoes_predefinidas TO service_role;
ALTER TABLE public.funcoes_predefinidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read" ON public.funcoes_predefinidas FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert" ON public.funcoes_predefinidas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete" ON public.funcoes_predefinidas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY "auth read" ON public.documentos;
DROP POLICY "auth insert" ON public.documentos;
DROP POLICY "auth update" ON public.documentos;
DROP POLICY "auth delete" ON public.documentos;
CREATE POLICY "admin all" ON public.documentos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "gestora read assigned" ON public.documentos FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.solicitacoes_assinatura s
    JOIN public.user_roles ur ON ur.user_id = auth.uid() AND ur.role::text = s.gestora
    WHERE s.documento_id = documentos.id
  )
);

DROP POLICY "auth all" ON public.solicitacoes_assinatura;
CREATE POLICY "admin all" ON public.solicitacoes_assinatura FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "gestora read own" ON public.solicitacoes_assinatura FOR SELECT TO authenticated USING (
  gestora IN (SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = auth.uid())
);

DROP POLICY "auth all" ON public.assinaturas_gestoras;
CREATE POLICY "admin all" ON public.assinaturas_gestoras FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));