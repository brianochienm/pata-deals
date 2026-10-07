import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { ksh } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/redemption/$id")({
  head: () => ({ meta: [{ title: "Your deal code — Pata" }, { name: "description", content: "Show this code to redeem your offer." }] }),
  component: RedemptionPage,
});

function RedemptionPage() {
  const { id } = Route.useParams();
  const { data: r, isLoading } = useQuery({
    queryKey: ["redemption", id],
    queryFn: async () =>
      (await supabase.from("redemptions").select("*, promotions(title,promo_price,original_price,instructions,online_url), businesses(name)").eq("id", id).maybeSingle()).data as any,
  });
  if (isLoading) return <p className="p-8 text-center text-muted-foreground">Loading…</p>;
  if (!r) return <p className="p-8 text-center">Code not found.</p>;
  return (
    <div className="mx-auto max-w-sm px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">{r.businesses?.name}</p>
      <h1 className="mt-1 text-xl font-semibold">{r.promotions?.title}</h1>
      <p className="mt-1 text-primary">{ksh(r.promotions?.promo_price)}</p>
      <div className="glass mt-6 p-6">
        <div className="mx-auto w-fit rounded-xl bg-foreground p-3">
          <QRCodeSVG value={r.code} size={200} />
        </div>
        <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Promo code</p>
        <p className="text-3xl font-bold tracking-wider">{r.code}</p>
        <p className="mt-2 inline-block rounded-full bg-glass px-3 py-1 text-xs capitalize">{r.status}</p>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Show this code to the business to redeem your offer.</p>
      {r.promotions?.instructions && <p className="mt-2 text-sm">{r.promotions.instructions}</p>}
      <Link to="/account" search={{ tab: "redemptions" }} className="mt-6 inline-block text-sm text-primary">All my redemptions</Link>
    </div>
  );
}
