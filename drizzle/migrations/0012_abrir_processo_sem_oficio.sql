CREATE OR REPLACE FUNCTION public.abrir_processo_simples(_id uuid, _numero bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.pode_emitir(auth.uid()) THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.processos WHERE id=_id AND (criado_por=auth.uid() OR public.has_role(auth.uid(),'admin')) AND aberto_em IS NULL) THEN RAISE EXCEPTION 'Processo não disponível'; END IF;
  IF _numero IS NULL OR _numero < 1 OR EXISTS(SELECT 1 FROM public.processos WHERE numero=_numero AND id<>_id) THEN RAISE EXCEPTION 'Numeração já utilizada'; END IF;
  UPDATE public.processos SET numero=_numero, aberto_em=now() WHERE id=_id;
END $$;
GRANT EXECUTE ON FUNCTION public.abrir_processo_simples(uuid, bigint) TO authenticated;