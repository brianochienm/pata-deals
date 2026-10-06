import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Ctx = { user: User | null; session: Session | null; loading: boolean };
const AuthCtx = createContext<Ctx>({ user: null, session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      if (event === "SIGNED_IN" || event === "USER_UPDATED") qc.invalidateQueries();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  return (
    <AuthCtx.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export function useRoles() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role);
    },
  });
  const roles = q.data ?? [];
  return {
    roles,
    isAdmin: roles.includes("admin"),
    isBusiness: roles.includes("business"),
    loading: q.isLoading,
  };
}

export function useFavourites() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["favs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("favourites").select("promotion_id");
      if (error) throw error;
      return new Set((data ?? []).map((f) => f.promotion_id));
    },
  });
  const toggle = async (promotionId: string) => {
    if (!user) return false;
    const has = q.data?.has(promotionId);
    if (has) await supabase.from("favourites").delete().eq("promotion_id", promotionId).eq("user_id", user.id);
    else await supabase.from("favourites").insert({ promotion_id: promotionId, user_id: user.id });
    qc.invalidateQueries({ queryKey: ["favs"] });
    return true;
  };
  return { favs: q.data ?? new Set<string>(), toggle };
}
