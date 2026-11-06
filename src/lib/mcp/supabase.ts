import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

function url() { const v = process.env["SUPABASE_URL"]; if (!v) throw new Error("SUPABASE_URL ausente"); return v; }
function key() { const v = process.env["SUPABASE_PUBLISHABLE_KEY"]; if (!v) throw new Error("SUPABASE_PUBLISHABLE_KEY ausente"); return v; }

export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("supabaseForUser requires a verified OAuth token");
  return createClient(url(), key(), {
    global: { headers: { Authorization: `Bearer ${token}`, apikey: key() } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
