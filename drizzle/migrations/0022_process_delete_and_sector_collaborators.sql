CREATE POLICY processos_delete ON public.processos FOR DELETE TO authenticated USING (pode_emitir(auth.uid()) AND (criado_por = auth.uid() OR has_role(auth.uid(),'admin'::app_role)));
CREATE TABLE public.setor_colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_user_id uuid NOT NULL,
  nome text NOT NULL CHECK (char_length(nome) BETWEEN 3 AND 200),
  funcao text NOT NULL CHECK (char_length(funcao) BETWEEN 2 AND 200),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setor_colaboradores TO authenticated;
GRANT ALL ON public.setor_colaboradores TO service_role;
ALTER TABLE public.setor_colaboradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY colaboradores_own ON public.setor_colaboradores FOR ALL TO authenticated
  USING (setor_user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (setor_user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));