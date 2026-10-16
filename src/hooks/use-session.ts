import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function useRequireSession(adminOnly = true) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) { setReady(false); navigate({ to: "/login" }); }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session && adminOnly) {
        const { data: roles, error } = await supabase.from("user_roles").select("role");
        setIsAdmin(roles?.some(r => r.role === "admin") ?? false);
        if (error || !roles?.some(r => r.role === "admin" || (r.role as string) === "emissor")) { navigate({ to: "/painel" }); return; }
      }
      setReady(true);
      if (!data.session) navigate({ to: "/login" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, adminOnly]);
  return { session, isAdmin, ready: ready && !!session };
}
