import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listarDocumentos from "./tools/listar-documentos";
import verDocumento from "./tools/ver-documento";
import listarProcessos from "./tools/listar-processos";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "seiigcm",
  title: "Seiigcm",
  version: "0.1.0",
  instructions: "Ferramentas do SEII GCM: consultar documentos e processos internos que o usuário conectado tem permissão de ver.",
  auth: auth.oauth.issuer({ issuer: `https://${projectRef}.supabase.co/auth/v1`, acceptedAudiences: "authenticated" }),
  tools: [listarDocumentos, verDocumento, listarProcessos],
});
