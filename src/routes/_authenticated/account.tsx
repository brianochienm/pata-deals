import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PROMO_SELECT, type Promo } from "@/lib/data";
import { DealCard } from "@/components/DealCard";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/account")({
  validateSearch: z.object({ tab: z.enum(["saved", "redemptions"]).optional() }),
  head: () => ({ meta: [{ title: "My account — Duka" }, { name: "description", content: "Your saved deals and redemptions." }] }),
  component: Account,
});

function Account() {
  const { user } = useAuth();
  const { tab = "redemptions" } = Route.useSearch();
  const { data: reds } = useQuery({
    queryKey: ["my-redemptions"],
    queryFn: async () => (await supabase.from("redemptions").select("id,code,status,created_at,promotions(title)").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: saved } = useQuery({
    queryKey: ["saved-promos"],
    queryFn: async () => ((await supabase.from("favourites").select(`promotions(${PROMO_SELECT})`)).data ?? []).map((f: any) => f.promotions).filter(Boolean) as Promo[],
  });
  const t = (k: "saved" | "redemptions", l: string) => (
    <Link to="/account" search={{ tab: k }} className={`rounded-full px-3 py-1.5 text-sm ${tab === k ? "bg-primary text-primary-foreground" : "bg-glass"}`}>{l}</Link>
  );
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-semibold">My account</h1>
      <p className="text-sm text-muted-foreground">{user?.email}</p>
      <div className="mt-4 flex gap-2">{t("redemptions", "My redemptions")}{t("saved", "Saved deals")}</div>
      {tab === "redemptions" ? (
        <div className="mt-4 grid gap-2">
          {reds?.length ? reds.map((r: any) => (
            <Link key={r.id} to="/redemption/$id" params={{ id: r.id }} className="glass flex items-center justify-between p-3">
              <div><p className="text-sm font-semibold">{r.promotions?.title}</p><p className="text-xs text-muted-foreground">{r.code}</p></div>
              <span className="rounded-full bg-glass px-2 py-1 text-xs capitalize">{r.status}</span>
            </Link>
          )) : <p className="text-sm text-muted-foreground">No redemptions yet.</p>}
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {saved?.length ? saved.map((p) => <DealCard key={p.id} p={p} />) : <p className="text-sm text-muted-foreground">No saved deals yet.</p>}
        </div>
      )}
    </div>
  );
}
