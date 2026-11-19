DROP POLICY IF EXISTS "auth read paineis" ON public.paineis;
CREATE POLICY "read paineis scoped" ON public.paineis FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR (ativo AND public.conta_ativa(auth.uid())));
DROP POLICY IF EXISTS "auth read" ON public.funcoes_predefinidas;
CREATE POLICY "active accounts read funcoes" ON public.funcoes_predefinidas FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.conta_ativa(auth.uid()));