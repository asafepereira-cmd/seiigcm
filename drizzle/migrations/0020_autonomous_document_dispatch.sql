DO $$ DECLARE f text; BEGIN
SELECT pg_get_functiondef('public.encaminhar_documento(uuid,jsonb,text,date,text)'::regprocedure) INTO f;
IF position('(public.e_setor(auth.uid()) AND public.pode_emitir(auth.uid()))' in f)=0 THEN RAISE EXCEPTION 'Unexpected dispatch guard'; END IF;
f:=replace(f,'(public.e_setor(auth.uid()) AND public.pode_emitir(auth.uid()))','public.pode_emitir(auth.uid())'); EXECUTE f;
SELECT pg_get_functiondef('public.salvar_documento(uuid,jsonb,uuid)'::regprocedure) INTO f;
f:=replace(f,'(d.criado_por IS DISTINCT FROM auth.uid() OR d.analise_admin)','(d.criado_por IS DISTINCT FROM auth.uid())'); EXECUTE f;
END $$;
CREATE OR REPLACE FUNCTION public.submeter_analise(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
PERFORM public.enviar_documento(_id,ARRAY['administrativa','pedagogica']::text[],'[]'::jsonb,'normal',NULL,''); END $$;
REVOKE ALL ON FUNCTION public.submeter_analise(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submeter_analise(uuid) TO authenticated;
COMMENT ON COLUMN public.documentos.analise_admin IS 'DEPRECATED: all authorized emitters dispatch their own documents without administrator review';