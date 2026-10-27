CREATE OR REPLACE FUNCTION public.assinar_identificado(_token text, _decisao text, _observacoes text, _nome text DEFAULT NULL, _funcao text DEFAULT NULL, _cpf text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.solicitacoes_assinatura; manager_role text; signer_id uuid;
BEGIN
 SELECT * INTO r FROM public.solicitacoes_assinatura WHERE token = _token FOR UPDATE;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Link inválido'; END IF;
 IF r.gestora IN ('pedagogica','administrativa') THEN manager_role := r.gestora;
 ELSIF r.gestora LIKE 'user:%' THEN
  signer_id := substring(r.gestora FROM 6)::uuid;
  SELECT role::text INTO manager_role FROM public.user_roles WHERE user_id = signer_id AND role IN ('pedagogica','administrativa') ORDER BY role::text LIMIT 1;
 END IF;
 IF manager_role IS NOT NULL THEN
  UPDATE public.solicitacoes_assinatura SET signatario_nome = CASE manager_role WHEN 'pedagogica' THEN 'NUBIA PAULO DA COSTA ANDRADE' ELSE 'ADRIANA ROSADO MAIA OLIVEIRA DOMINGUES' END,
   signatario_funcao = CASE manager_role WHEN 'pedagogica' THEN 'Gestora Pedagógica do CEM XXIII' ELSE 'Gestora Administrativa do CEM XXIII' END WHERE id = r.id;
 ELSIF signer_id IS NOT NULL AND public.e_setor(signer_id) THEN
  IF length(trim(coalesce(_nome,''))) < 3 OR length(trim(coalesce(_funcao,''))) < 2 OR coalesce(_cpf,'') !~ '^[0-9]{11}$' THEN RAISE EXCEPTION 'Identificação obrigatória'; END IF;
  INSERT INTO public.assinante_identidades(solicitacao_id,nome,funcao,cpf) VALUES(r.id,trim(_nome),trim(_funcao),_cpf);
  UPDATE public.solicitacoes_assinatura SET signatario_nome = trim(_nome), signatario_funcao = trim(_funcao) WHERE id = r.id;
 END IF;
 PERFORM public.registrar_assinatura(_token,_decisao,_observacoes);
END $$;
REVOKE ALL ON FUNCTION public.assinar_identificado(text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assinar_identificado(text,text,text,text,text,text) TO service_role;