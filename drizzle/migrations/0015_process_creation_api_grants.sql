GRANT SELECT, INSERT, UPDATE, DELETE ON public.processos TO authenticated;
GRANT ALL ON public.processos TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.processos_numero_seq TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.abrir_processo_simples(uuid,bigint) TO authenticated;