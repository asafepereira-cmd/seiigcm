CREATE OR REPLACE FUNCTION public.excluir_solicitacao(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE s public.solicitacoes_assinatura;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
  SELECT * INTO s FROM public.solicitacoes_assinatura WHERE id=_id;
  IF s.id IS NULL OR s.assinado_em IS NOT NULL THEN RAISE EXCEPTION 'Solicitação não disponível'; END IF;
  DELETE FROM public.solicitacoes_assinatura WHERE id=s.id;
END $$;
GRANT EXECUTE ON FUNCTION public.excluir_solicitacao(uuid) TO authenticated;