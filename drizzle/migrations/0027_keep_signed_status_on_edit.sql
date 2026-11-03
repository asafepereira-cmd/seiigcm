DO $$ DECLARE f text; BEGIN
SELECT pg_get_functiondef('public.salvar_documento(uuid,jsonb,uuid)'::regprocedure) INTO f;
f:=replace(f,'RETURN d.id; END IF; IF d.emitido_em IS NOT NULL THEN
INSERT','RETURN d.id; END IF; IF d.emitido_em IS NOT NULL AND d.status=''assinado'' THEN UPDATE public.documentos SET emitido_em=NULL WHERE id=d.id; UPDATE public.documentos SET numero=n,dados=_dados,assunto=coalesce(_dados->>''assunto'',''''),updated_at=now() WHERE id=d.id; UPDATE public.documentos SET emitido_em=d.emitido_em,status=''assinado'' WHERE id=d.id; RETURN d.id; END IF; IF d.emitido_em IS NOT NULL THEN
INSERT');
EXECUTE f; END $$;