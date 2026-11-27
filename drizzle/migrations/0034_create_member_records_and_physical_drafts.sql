CREATE TABLE public.integrantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text NOT NULL DEFAULT '',
  rg text NOT NULL DEFAULT '',
  data_nascimento date,
  telefone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  endereco text NOT NULL DEFAULT '',
  vinculo text NOT NULL DEFAULT 'Novo integrante',
  funcao text NOT NULL DEFAULT '',
  unidade text NOT NULL DEFAULT 'CEMXXXIII/GCM/CCM',
  data_ingresso date NOT NULL DEFAULT current_date,
  situacao text NOT NULL DEFAULT 'Ativo' CHECK (situacao IN ('Ativo', 'Afastado', 'Desligado')),
  observacoes text NOT NULL DEFAULT '',
  dados_extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrantes TO authenticated;
GRANT ALL ON public.integrantes TO service_role;
ALTER TABLE public.integrantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administradores consultam integrantes" ON public.integrantes FOR SELECT TO authenticated USING ((select public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Administradores cadastram integrantes" ON public.integrantes FOR INSERT TO authenticated WITH CHECK ((select public.has_role((select auth.uid()), 'admin')) AND criado_por = (select auth.uid()));
CREATE POLICY "Administradores alteram integrantes" ON public.integrantes FOR UPDATE TO authenticated USING ((select public.has_role((select auth.uid()), 'admin'))) WITH CHECK ((select public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Administradores excluem integrantes" ON public.integrantes FOR DELETE TO authenticated USING ((select public.has_role((select auth.uid()), 'admin')));
CREATE INDEX integrantes_nome_idx ON public.integrantes (nome);
CREATE INDEX integrantes_criado_por_created_at_idx ON public.integrantes (criado_por, created_at DESC);

CREATE TABLE public.minutas_fisicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrante_id uuid NOT NULL REFERENCES public.integrantes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('integrante', 'credenciamento', 'voluntariado', 'outros')),
  titulo text NOT NULL,
  conteudo text NOT NULL,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.minutas_fisicas TO authenticated;
GRANT ALL ON public.minutas_fisicas TO service_role;
ALTER TABLE public.minutas_fisicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administradores consultam minutas" ON public.minutas_fisicas FOR SELECT TO authenticated USING ((select public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Administradores criam minutas" ON public.minutas_fisicas FOR INSERT TO authenticated WITH CHECK ((select public.has_role((select auth.uid()), 'admin')) AND criado_por = (select auth.uid()));
CREATE POLICY "Administradores alteram minutas" ON public.minutas_fisicas FOR UPDATE TO authenticated USING ((select public.has_role((select auth.uid()), 'admin'))) WITH CHECK ((select public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Administradores excluem minutas" ON public.minutas_fisicas FOR DELETE TO authenticated USING ((select public.has_role((select auth.uid()), 'admin')));
CREATE INDEX minutas_fisicas_integrante_created_at_idx ON public.minutas_fisicas (integrante_id, created_at DESC);

CREATE TABLE public.integrante_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrante_id uuid NOT NULL REFERENCES public.integrantes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  caminho text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  tamanho bigint NOT NULL DEFAULT 0,
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrante_anexos TO authenticated;
GRANT ALL ON public.integrante_anexos TO service_role;
ALTER TABLE public.integrante_anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administradores consultam anexos de integrantes" ON public.integrante_anexos FOR SELECT TO authenticated USING ((select public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Administradores criam anexos de integrantes" ON public.integrante_anexos FOR INSERT TO authenticated WITH CHECK ((select public.has_role((select auth.uid()), 'admin')) AND criado_por = (select auth.uid()));
CREATE POLICY "Administradores alteram anexos de integrantes" ON public.integrante_anexos FOR UPDATE TO authenticated USING ((select public.has_role((select auth.uid()), 'admin'))) WITH CHECK ((select public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Administradores excluem anexos de integrantes" ON public.integrante_anexos FOR DELETE TO authenticated USING ((select public.has_role((select auth.uid()), 'admin')));
CREATE INDEX integrante_anexos_integrante_created_at_idx ON public.integrante_anexos (integrante_id, created_at DESC);

CREATE TABLE public.integrante_ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrante_id uuid NOT NULL REFERENCES public.integrantes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('Advertência', 'Processo', 'Ocorrência')),
  titulo text NOT NULL,
  descricao text NOT NULL,
  ocorrido_em date NOT NULL DEFAULT current_date,
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrante_ocorrencias TO authenticated;
GRANT ALL ON public.integrante_ocorrencias TO service_role;
ALTER TABLE public.integrante_ocorrencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administradores consultam ocorrencias de integrantes" ON public.integrante_ocorrencias FOR SELECT TO authenticated USING ((select public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Administradores criam ocorrencias de integrantes" ON public.integrante_ocorrencias FOR INSERT TO authenticated WITH CHECK ((select public.has_role((select auth.uid()), 'admin')) AND criado_por = (select auth.uid()));
CREATE POLICY "Administradores alteram ocorrencias de integrantes" ON public.integrante_ocorrencias FOR UPDATE TO authenticated USING ((select public.has_role((select auth.uid()), 'admin'))) WITH CHECK ((select public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Administradores excluem ocorrencias de integrantes" ON public.integrante_ocorrencias FOR DELETE TO authenticated USING ((select public.has_role((select auth.uid()), 'admin')));
CREATE INDEX integrante_ocorrencias_integrante_data_idx ON public.integrante_ocorrencias (integrante_id, ocorrido_em DESC);

CREATE POLICY "Administradores veem arquivos de integrantes" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'integrantes-documentos' AND (select public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Administradores enviam arquivos de integrantes" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'integrantes-documentos' AND (select public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Administradores alteram arquivos de integrantes" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'integrantes-documentos' AND (select public.has_role((select auth.uid()), 'admin'))) WITH CHECK (bucket_id = 'integrantes-documentos' AND (select public.has_role((select auth.uid()), 'admin')));
CREATE POLICY "Administradores excluem arquivos de integrantes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'integrantes-documentos' AND (select public.has_role((select auth.uid()), 'admin')));