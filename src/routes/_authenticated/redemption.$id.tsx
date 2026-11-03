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
  const { data: settings } = useQuery({
    queryKey: ["unlock-required", r?.promotion_id],
    enabled: !!r,
    queryFn: async () => ({ unlock_fee_enabled: !!((await supabase.rpc("unlock_fee_for", { _promotion_id: r.promotion_id })).data as any)?.[0]?.required }),
  });
  if (isLoading) return <p className="p-8 text-center text-muted-foreground">Loading…</p>;
  if (!r) return <p className="p-8 text-center">Code not found.</p>;
  const locked = settings?.unlock_fee_enabled && !r.unlock_paid;
  const fee = Number(r.unlock_fee ?? 0);
  const price = Number(r.promotions?.promo_price ?? 0);
  return (
    <div className="mx-auto max-w-sm px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">{r.businesses?.name}</p>
      <h1 className="mt-1 text-xl font-semibold">{r.promotions?.title}</h1>
      <p className="mt-1 text-primary">{ksh(r.promotions?.promo_price)}</p>
      <div className="glass mt-4 p-3 text-left text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Unlock fee to Pata</span><span className={r.unlock_paid ? "text-primary" : ""}>{ksh(fee)} {r.unlock_paid ? "· Paid" : ""}</span></div>
        <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Balance at the shop</span><span className="font-semibold">{ksh(Math.max(0, price - (r.unlock_paid ? fee : 0)))}</span></div>
      </div>
      {locked ? (
        <div className="glass mt-4 p-6">
          <p className="font-semibold">Pay {ksh(fee)} to unlock your code</p>
          <p className="mt-1 text-sm text-muted-foreground">You'll get an M-Pesa prompt on your phone. The fee is taken off your bill at the shop.</p>
          <button disabled className="mt-4 w-full rounded-[10px] bg-primary py-3 text-sm font-semibold text-primary-foreground opacity-60">M-Pesa payment coming soon</button>
        </div>
      ) : (
      <div className="glass mt-6 p-6">
        <div className="mx-auto w-fit rounded-xl bg-foreground p-3">
          <QRCodeSVG value={r.code} size={200} />
        </div>
        <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Promo code</p>
        <p className="text-3xl font-bold tracking-wider">{r.code}</p>
        <p className="mt-2 inline-block rounded-full bg-glass px-3 py-1 text-xs capitalize">{r.status}</p>
      </div>
      )}
      <p className="mt-4 text-sm text-muted-foreground">Show this code to the business to redeem your offer.</p>
      {r.promotions?.instructions && <p className="mt-2 text-sm">{r.promotions.instructions}</p>}
      <Link to="/account" search={{ tab: "redemptions" }} className="mt-6 inline-block text-sm text-primary">All my redemptions</Link>
    </div>
  );
}
