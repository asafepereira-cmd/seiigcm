CREATE OR REPLACE FUNCTION public.encaminhar_documento(_id uuid,_signatarios jsonb,_prioridade text DEFAULT 'normal',_prazo date DEFAULT NULL,_termo text DEFAULT '') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE d public.documentos; e jsonb; chave text; finalidade text; BEGIN
IF NOT public.has_role(auth.uid(),'admin') OR NOT public.conta_ativa(auth.uid()) THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
SELECT * INTO d FROM public.documentos WHERE id=_id FOR UPDATE;
IF d.id IS NULL OR jsonb_array_length(_signatarios)<1 OR jsonb_array_length(_signatarios)>10 OR _prioridade NOT IN ('normal','alta') THEN RAISE EXCEPTION 'Envio inválido'; END IF;
FOR e IN SELECT * FROM jsonb_array_elements(_signatarios) LOOP
finalidade:=coalesce(e->>'finalidade','deferimento'); IF finalidade NOT IN ('ciencia','deferimento') THEN RAISE EXCEPTION 'Finalidade inválida'; END IF;
IF e->>'gestora' IN ('pedagogica','administrativa') THEN chave:=e->>'gestora'; IF EXISTS(SELECT 1 FROM public.user_roles WHERE role::text=chave AND NOT public.permissao_painel(user_id,'assinar')) THEN RAISE EXCEPTION 'Assinatura desativada'; END IF;
ELSE IF length(trim(coalesce(e->>'nome','')))<1 OR length(trim(coalesce(e->>'funcao','')))<1 THEN RAISE EXCEPTION 'Informe nome e função'; END IF;
IF coalesce(e->>'user_id','')<>'' THEN IF NOT public.permissao_painel((e->>'user_id')::uuid,'assinar') THEN RAISE EXCEPTION 'Painel sem assinatura'; END IF; chave:='user:'||(e->>'user_id'); ELSE chave:='extra:'||gen_random_uuid()::text; END IF; END IF;
IF EXISTS(SELECT 1 FROM public.solicitacoes_assinatura WHERE documento_id=_id AND versao=d.versao AND gestora=chave) THEN CONTINUE; END IF;
INSERT INTO public.solicitacoes_assinatura(documento_id,gestora,token,signatario_nome,signatario_funcao,termo,versao,finalidade) VALUES(_id,chave,replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),e->>'nome',e->>'funcao',_termo,d.versao,finalidade);
END LOOP;
UPDATE public.documentos SET analise_admin=false,status=CASE WHEN EXISTS(SELECT 1 FROM public.solicitacoes_assinatura WHERE documento_id=_id AND versao=d.versao AND assinado_em IS NULL) THEN 'enviado' ELSE 'assinado' END,emitido_em=coalesce(emitido_em,now()),updated_at=now(),prioridade=_prioridade,prazo=_prazo WHERE id=_id;
END $$;
CREATE OR REPLACE FUNCTION public.enviar_documento(_id uuid,_gestoras text[],_extras jsonb,_prioridade text,_prazo date,_termo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM public.encaminhar_documento(_id,coalesce((SELECT jsonb_agg(jsonb_build_object('gestora',g,'finalidade','deferimento')) FROM unnest(_gestoras) g),'[]'::jsonb)||_extras,_prioridade,_prazo,_termo); END $$;
CREATE OR REPLACE FUNCTION public.registrar_assinatura(_token text,_decisao text,_observacoes text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.solicitacoes_assinatura; BEGIN
SELECT * INTO r FROM public.solicitacoes_assinatura WHERE token=_token;
IF r.id IS NULL THEN RAISE EXCEPTION 'Link inválido'; END IF;
PERFORM 1 FROM public.documentos WHERE id=r.documento_id AND emitido_em IS NOT NULL AND versao=r.versao FOR UPDATE;
IF NOT FOUND OR length(_observacoes)>600 OR _decisao IS NULL OR (r.finalidade='ciencia' AND _decisao<>'ciente') OR (r.finalidade='deferimento' AND _decisao NOT IN ('deferido','indeferido')) THEN RAISE EXCEPTION 'Assinatura inválida ou versão substituída'; END IF;
IF r.gestora LIKE 'user:%' AND NOT public.permissao_painel(substring(r.gestora FROM 6)::uuid,'assinar') THEN RAISE EXCEPTION 'Assinatura desativada'; END IF;
IF r.gestora IN ('pedagogica','administrativa') AND EXISTS(SELECT 1 FROM public.user_roles WHERE role::text=r.gestora AND NOT public.permissao_painel(user_id,'assinar')) THEN RAISE EXCEPTION 'Assinatura desativada'; END IF;
UPDATE public.solicitacoes_assinatura SET decisao=_decisao,observacoes=trim(_observacoes),assinado_em=now() WHERE id=r.id AND assinado_em IS NULL;
IF NOT FOUND THEN RAISE EXCEPTION 'Já assinado'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.solicitacoes_assinatura WHERE documento_id=r.documento_id AND versao=r.versao AND assinado_em IS NULL) THEN UPDATE public.documentos SET status='assinado',updated_at=now() WHERE id=r.documento_id; END IF; END $$;
CREATE OR REPLACE FUNCTION public.marcar_analise(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
UPDATE public.solicitacoes_assinatura s SET aberto_em=coalesce(aberto_em,now()),em_analise_em=coalesce(em_analise_em,now()) WHERE s.id=_id AND s.assinado_em IS NULL AND public.permissao_painel(auth.uid(),'assinar') AND EXISTS(SELECT 1 FROM public.documentos d WHERE d.id=s.documento_id AND d.versao=s.versao AND d.emitido_em IS NOT NULL) AND (s.gestora='user:'||auth.uid()::text OR EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.role::text=s.gestora)); IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não disponível'; END IF; END $$;
REVOKE ALL ON FUNCTION public.encaminhar_documento(uuid,jsonb,text,date,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.encaminhar_documento(uuid,jsonb,text,date,text) TO authenticated;
CREATE POLICY conta_comentarios ON public.documento_comentarios AS RESTRICTIVE FOR ALL TO authenticated USING(public.conta_ativa(auth.uid())) WITH CHECK(public.conta_ativa(auth.uid()));
CREATE POLICY conta_processos ON public.processos AS RESTRICTIVE FOR ALL TO authenticated USING(public.conta_ativa(auth.uid())) WITH CHECK(public.conta_ativa(auth.uid()));
