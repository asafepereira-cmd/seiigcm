CREATE TABLE public.unidades (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, sigla text NOT NULL,
 pai_id uuid REFERENCES public.unidades(id), ativa boolean NOT NULL DEFAULT true,
 pode_emitir boolean NOT NULL DEFAULT true, pode_receber boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.unidades TO authenticated;
GRANT ALL ON public.unidades TO service_role;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY unidades_select ON public.unidades FOR SELECT TO authenticated USING ((select public.conta_ativa((select auth.uid()))));
CREATE POLICY unidades_insert ON public.unidades FOR INSERT TO authenticated WITH CHECK ((select public.has_role((select auth.uid()),'admin')));
CREATE POLICY unidades_update ON public.unidades FOR UPDATE TO authenticated USING ((select public.has_role((select auth.uid()),'admin'))) WITH CHECK ((select public.has_role((select auth.uid()),'admin')));
CREATE UNIQUE INDEX unidades_sigla_raiz_idx ON public.unidades(lower(sigla)) WHERE pai_id IS NULL;
CREATE UNIQUE INDEX unidades_sigla_pai_idx ON public.unidades(pai_id,lower(sigla)) WHERE pai_id IS NOT NULL;
ALTER TABLE public.paineis ADD COLUMN unidade_id uuid REFERENCES public.unidades(id);
ALTER TABLE public.integrantes ADD COLUMN unidade_id uuid REFERENCES public.unidades(id);
CREATE INDEX paineis_unidade_idx ON public.paineis(unidade_id);
CREATE INDEX integrantes_unidade_idx ON public.integrantes(unidade_id);
CREATE FUNCTION public.validar_hierarquia_unidade() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE atual uuid; vistos uuid[] := ARRAY[NEW.id]; BEGIN
PERFORM pg_advisory_xact_lock(77123884);
IF NEW.nome IS NULL OR length(trim(NEW.nome))<3 OR NEW.sigla !~ '^[A-Z0-9]{2,20}$' THEN RAISE EXCEPTION 'Nome ou sigla inválidos'; END IF;
atual := NEW.pai_id;
WHILE atual IS NOT NULL LOOP
IF atual=ANY(vistos) THEN RAISE EXCEPTION 'Uma unidade não pode criar um ciclo de subunidades'; END IF;
vistos := array_append(vistos,atual);
SELECT pai_id INTO atual FROM public.unidades WHERE id=atual;
END LOOP; RETURN NEW; END $$;
CREATE TRIGGER validar_unidades BEFORE INSERT OR UPDATE ON public.unidades FOR EACH ROW EXECUTE FUNCTION public.validar_hierarquia_unidade();
CREATE FUNCTION public.unidade_permite(_id uuid,_acao text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE u public.unidades; atual uuid:=_id; vistos uuid[]:=ARRAY[]::uuid[]; BEGIN
IF _acao NOT IN ('emitir','receber') THEN RETURN false; END IF;
IF atual IS NULL THEN RETURN true; END IF;
WHILE atual IS NOT NULL LOOP
IF atual=ANY(vistos) THEN RETURN false; END IF;
vistos:=array_append(vistos,atual);
SELECT * INTO u FROM public.unidades WHERE id=atual;
IF NOT FOUND OR NOT u.ativa OR (_acao='emitir' AND NOT u.pode_emitir) OR (_acao='receber' AND NOT u.pode_receber) THEN RETURN false; END IF;
atual:=u.pai_id;
END LOOP; RETURN true; END $$;
REVOKE ALL ON FUNCTION public.unidade_permite(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unidade_permite(uuid,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.pode_emitir(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT public.conta_ativa(_uid) AND (public.has_role(_uid,'admin') OR (public.has_role(_uid,'emissor') AND EXISTS(SELECT 1 FROM public.paineis WHERE user_id=_uid AND pode_emitir))) AND public.unidade_permite((SELECT unidade_id FROM public.paineis WHERE user_id=_uid),'emitir') $$;
CREATE FUNCTION public.validar_unidade_documento() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NOT NULL AND (TG_OP='INSERT' OR (OLD.emitido_em IS NULL AND NEW.emitido_em IS NOT NULL)) AND NOT public.unidade_permite((SELECT unidade_id FROM public.paineis WHERE user_id=auth.uid()),'emitir') THEN RAISE EXCEPTION 'A unidade não está autorizada a emitir documentos'; END IF; RETURN NEW; END $$;
CREATE TRIGGER unidade_emissao_documento BEFORE INSERT OR UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.validar_unidade_documento();
CREATE FUNCTION public.validar_unidade_destinatario() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE alvo uuid; BEGIN
IF TG_TABLE_NAME='documento_destinatarios' THEN alvo:=NEW.user_id;
ELSIF NEW.gestora LIKE 'user:%' THEN alvo:=substring(NEW.gestora FROM 6)::uuid;
ELSIF NEW.gestora IN ('admin','pedagogica','administrativa') THEN SELECT user_id INTO alvo FROM public.user_roles WHERE role::text=NEW.gestora LIMIT 1;
END IF;
IF alvo IS NOT NULL AND NOT public.unidade_permite((SELECT unidade_id FROM public.paineis WHERE user_id=alvo),'receber') THEN RAISE EXCEPTION 'A unidade de destino não está autorizada a receber documentos'; END IF;
IF auth.uid() IS NOT NULL AND NOT public.unidade_permite((SELECT unidade_id FROM public.paineis WHERE user_id=auth.uid()),'emitir') THEN RAISE EXCEPTION 'A unidade não está autorizada a emitir documentos'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER unidade_recebimento_documento BEFORE INSERT ON public.documento_destinatarios FOR EACH ROW EXECUTE FUNCTION public.validar_unidade_destinatario();
CREATE TRIGGER unidade_recebimento_assinatura BEFORE INSERT ON public.solicitacoes_assinatura FOR EACH ROW EXECUTE FUNCTION public.validar_unidade_destinatario();