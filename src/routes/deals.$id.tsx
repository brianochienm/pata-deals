import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Clock, Ticket, Tag, Star, Flag, Globe, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PROMO_SELECT, type Promo } from "@/lib/data";
import { endsIn, ksh, methodLabel } from "@/lib/format";
import { promoImage } from "@/lib/images";
import { useAuth, useFavourites } from "@/hooks/use-auth";
import { Logo } from "@/components/DealCard";
import { FollowButton } from "@/components/Notify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/deals/$id")({
  head: () => ({
    meta: [
      { title: "Deal details — Pata" },
      { name: "description", content: "See the offer, savings, terms and how to redeem." },
      { property: "og:title", content: "Deal details — Pata" },
      { property: "og:description", content: "See the offer, savings, terms and how to redeem." },
    ],
  }),
  component: DealPage,
});

function DealPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { favs, toggle } = useFavourites();
  const [busy, setBusy] = useState(false);

  const { data: p, isLoading } = useQuery({
    queryKey: ["promo", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("promotions").select(PROMO_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as Promo | null;
    },
  });
  const { data: used } = useQuery({
    queryKey: ["redeemed", id],
    queryFn: async () => (await supabase.rpc("redeemed_count", { _promotion_id: id })).data ?? 0,
  });
  const { data: reviews } = useQuery({
    queryKey: ["reviews", p?.business_id],
    enabled: !!p,
    queryFn: async () =>
      (await supabase.from("reviews").select("*").eq("business_id", p!.business_id).order("created_at", { ascending: false }).limit(20)).data ?? [],
  });
  const { data: mine } = useQuery({
    queryKey: ["my-redemption", id, user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("redemptions").select("id,status").eq("promotion_id", id).eq("user_id", user!.id).not("status", "in", "(cancelled,reversed)").maybeSingle()).data,
  });

  useEffect(() => {
    supabase.rpc("increment_view", { _promotion_id: id });
  }, [id]);

  if (isLoading) return <div className="mx-auto max-w-4xl p-4"><Skeleton className="h-96 rounded-2xl" /></div>;
  if (!p)
    return <div className="mx-auto max-w-md p-8 text-center"><p className="text-lg font-semibold">Deal not found</p><Link to="/deals" className="text-primary">Browse deals</Link></div>;

  const img = promoImage(p.image_url);
  const left = p.max_redemptions != null ? Math.max(0, p.max_redemptions - (used ?? 0)) : null;
  const expired = new Date(p.ends_at) < new Date();
  const avg = reviews?.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : null;

  const redeem = async () => {
    if (!user) {
      toast("Sign in to redeem this offer");
      nav({ to: "/auth", search: { redirect: `/deals/${id}` } });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("redeem_promotion", { _promotion_id: id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["redeemed", id] });
    if (p.redemption_method === "online" && p.online_url) window.open(p.online_url, "_blank", "noopener");
    nav({ to: "/redemption/$id", params: { id: (data as any).id } });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 pb-28">
      <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
        <div>
          <Gallery title={p.title} images={[img, ...(((p as any).gallery_urls ?? []) as string[])].filter(Boolean) as string[]} />
          <div className="glass mt-3 flex items-center gap-3 p-3">
            <Logo name={p.businesses?.name ?? ""} url={p.businesses?.logo_url} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{p.businesses?.name}</p>
              <p className="text-xs text-muted-foreground">{p.categories?.icon} {p.categories?.name}{avg ? ` · ★ ${avg.toFixed(1)} (${reviews!.length})` : ""}</p>
            </div>
            <FollowButton businessId={p.business_id} name={p.businesses?.name} />
          </div>
          {p.businesses?.description && <p className="mt-3 text-sm text-muted-foreground">{p.businesses.description}</p>}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {p.businesses?.phone && <a href={`tel:${p.businesses.phone}`} className="flex items-center gap-1"><Phone className="size-3" />{p.businesses.phone}</a>}
            {p.businesses?.website && <a href={p.businesses.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary"><Globe className="size-3" />Website</a>}
          </div>
        </div>

        <div>
          <span className="pill-coral rounded-full px-3 py-1 text-sm font-bold">🔥 {p.discount_pct}% OFF</span>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-balance">{p.title}</h1>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-muted-foreground line-through">{ksh(p.original_price)}</span>
            <span className="text-3xl font-bold text-primary">{ksh(p.promo_price)}</span>
          </div>
          <p className="mt-1 text-sm text-gold">You save {ksh(p.original_price - p.promo_price)}</p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="glass p-3"><MapPin className="mb-1 size-4 text-primary" />{p.locations?.area}, {p.locations?.city}</div>
            <div className="glass p-3"><Clock className="mb-1 size-4 text-coral" />{endsIn(p.ends_at)}<div className="text-xs text-muted-foreground">{new Date(p.ends_at).toLocaleDateString("en-KE", { dateStyle: "medium" })}</div></div>
            <div className="glass p-3"><Ticket className="mb-1 size-4 text-gold" />{methodLabel[p.redemption_method]}</div>
            <div className="glass p-3"><Tag className="mb-1 size-4 text-primary" />{left != null ? `${left} of ${p.max_redemptions} left` : `${used ?? 0} claimed`}</div>
          </div>

          <div className="mt-4 hidden md:block">
            <RedeemCTA mine={mine} expired={expired} soldOut={left === 0} busy={busy} onRedeem={redeem} />
            <Button variant="secondary" className="mt-2 w-full" onClick={async () => { if (!(await toggle(p.id))) nav({ to: "/auth" }); }}>
              {favs.has(p.id) ? "♥ Saved" : "♡ Save deal"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {p.description && <Info title="About this deal">{p.description}</Info>}
        {p.instructions && <Info title="How to redeem">{p.instructions}</Info>}
        {p.terms && <Info title="Terms & conditions">{p.terms}</Info>}
        <div className="glass overflow-hidden">
          <iframe
            title="Map"
            className="h-48 w-full border-0 opacity-90"
            loading="lazy"
            src={`https://www.google.com/maps?q=${encodeURIComponent(`${p.businesses?.name ?? ""} ${p.locations?.area ?? ""} Nairobi`)}&output=embed`}
          />
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Reviews</h2>
        {mine && <ReviewForm businessId={p.business_id} promotionId={p.id} />}
        <div className="mt-3 grid gap-2">
          {reviews?.length ? reviews.map((r) => (
            <div key={r.id} className="glass p-3">
              <div className="flex items-center gap-2 text-sm"><span className="font-semibold">{r.author_name ?? "Customer"}</span><span className="text-gold">{"★".repeat(r.rating)}</span></div>
              {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          )) : <p className="text-sm text-muted-foreground">No reviews yet. Redeem the deal to leave one.</p>}
        </div>
        {user && <ReportButton promotionId={p.id} />}
      </section>

      <div className="fixed inset-x-0 bottom-[57px] z-30 border-t border-border/50 bg-background/95 p-3 backdrop-blur md:hidden">
        <RedeemCTA mine={mine} expired={expired} soldOut={left === 0} busy={busy} onRedeem={redeem} />
      </div>
    </div>
  );
}

function RedeemCTA({ mine, expired, soldOut, busy, onRedeem }: { mine: any; expired: boolean; soldOut: boolean; busy: boolean; onRedeem: () => void }) {
  if (mine)
    return <Button asChild size="lg" className="w-full"><Link to="/redemption/$id" params={{ id: mine.id }}>View my code</Link></Button>;
  return (
    <Button size="lg" className="w-full" disabled={busy || expired || soldOut} onClick={onRedeem}>
      {expired ? "Offer expired" : soldOut ? "Fully claimed" : busy ? "Generating code…" : "Redeem This Offer"}
    </Button>
  );
}

function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="glass p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{children}</p></div>;
}

function ReviewForm({ businessId, promotionId }: { businessId: string; promotionId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const submit = async () => {
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle();
    const { error } = await supabase.from("reviews").insert({
      user_id: user!.id, business_id: businessId, promotion_id: promotionId, rating,
      comment: comment.trim().slice(0, 1000) || null, author_name: prof?.full_name ?? null,
    });
    if (error) { toast.error(error.code === "23505" ? "You already reviewed this deal" : error.message); return; }
    toast.success("Thanks for your review!");
    setComment("");
    qc.invalidateQueries({ queryKey: ["reviews"] });
  };
  return (
    <div className="glass mt-3 p-3">
      <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}><Star className={`size-5 ${n <= rating ? "fill-gold text-gold" : "text-muted-foreground"}`} /></button>
      ))}</div>
      <Textarea className="mt-2" maxLength={1000} placeholder="How was it?" value={comment} onChange={(e) => setComment(e.target.value)} />
      <Button size="sm" className="mt-2" onClick={submit}>Post review</Button>
    </div>
  );
}

function ReportButton({ promotionId }: { promotionId: string }) {
  const { user } = useAuth();
  const report = async () => {
    const reason = window.prompt("What's wrong with this offer?")?.trim();
    if (!reason || reason.length < 3) return;
    const { error } = await supabase.from("disputes").insert({ promotion_id: promotionId, reporter_id: user!.id, reason: reason.slice(0, 1000) });
    if (error) toast.error(error.message);
    else toast.success("Report sent to our team");
  };
  return <button onClick={report} className="mt-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-coral"><Flag className="size-3" />Report this offer</button>;
}

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [i, setI] = useState(0);
  const cur = images[i] ?? images[0];
  return (
    <div>
      <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-surface">
        {cur && <img src={cur} alt={title} className="size-full object-cover" />}
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {images.map((u, k) => (
            <button key={u + k} type="button" onClick={() => setI(k)} aria-label={`Photo ${k + 1}`} className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 ${k === i ? "border-primary" : "border-transparent opacity-70"}`}>
              <img src={u} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
