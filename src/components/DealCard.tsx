import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { Promo } from "@/lib/data";
import { endsIn, initials, ksh, toneFor } from "@/lib/format";
import { promoImage } from "@/lib/images";
import { useAuth, useFavourites } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

function SaveButton({ id }: { id: string }) {
  const { user } = useAuth();
  const { favs, toggle } = useFavourites();
  const nav = useNavigate();
  const saved = favs.has(id);
  return (
    <button
      aria-label={saved ? "Remove from saved" : "Save deal"}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
          toast("Sign in to save deals");
          nav({ to: "/auth" });
          return;
        }
        await toggle(id);
      }}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[10px] bg-glass transition-colors",
        saved ? "text-coral" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Heart className={cn("size-4", saved && "fill-current")} />
    </button>
  );
}

function Logo({ name, url, size = "md" }: { name: string; url?: string | null; size?: "md" | "sm" }) {
  const cls = size === "md" ? "size-8 rounded-[9px] text-xs" : "size-7 rounded-[8px] text-xs";
  if (url) return <img src={url} alt="" className={cn(cls, "shrink-0 object-cover")} />;
  return (
    <div className={cn(cls, "grid shrink-0 place-items-center font-semibold", toneFor(name))}>
      {initials(name)}
    </div>
  );
}

export function DealCard({ p }: { p: Promo }) {
  const img = promoImage(p.image_url);
  const biz = p.businesses?.name ?? "Business";
  const tone = toneFor(biz);
  return (
    <Link to="/deals/$id" params={{ id: p.id }} className="glass block p-3 transition hover:bg-accent">
      <div className="flex min-w-0 items-center gap-2">
        <Logo name={biz} url={p.businesses?.logo_url} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{biz}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            {p.locations?.area ?? "Nairobi"}
          </p>
        </div>
        <span className={cn("ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", tone)}>
          -{p.discount_pct}%
        </span>
      </div>
      <div className="mt-3 aspect-[2/1] w-full overflow-hidden rounded-[12px] bg-surface">
        {img && <img src={img} alt={p.title} loading="lazy" className="size-full object-cover" />}
      </div>
      <div className="mt-3">
        <p className="text-[15px] font-semibold leading-tight text-balance">{p.title}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-muted-foreground line-through">{ksh(p.original_price)}</span>
          <span className="text-lg font-semibold text-primary">{ksh(p.promo_price)}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-glass px-3 py-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 shrink-0 rounded-full bg-coral" />
          {endsIn(p.ends_at)}
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-[10px] bg-primary py-2 pl-3 pr-4 text-sm font-semibold text-primary-foreground">
            Redeem Deal
          </span>
          <SaveButton id={p.id} />
        </div>
      </div>
    </Link>
  );
}

export function MiniDealCard({ p }: { p: Promo }) {
  const img = promoImage(p.image_url);
  const biz = p.businesses?.name ?? "Business";
  return (
    <Link to="/deals/$id" params={{ id: p.id }} className="glass block p-3 transition hover:bg-accent">
      <div className="flex items-center gap-2">
        <Logo name={biz} url={p.businesses?.logo_url} size="sm" />
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", toneFor(biz))}>
          -{p.discount_pct}%
        </span>
      </div>
      <div className="mt-2 aspect-square w-full overflow-hidden rounded-[10px] bg-surface sm:aspect-[4/3]">
        {img && <img src={img} alt={p.title} loading="lazy" className="size-full object-cover" />}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">{p.title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-1.5">
        <span className="text-xs text-muted-foreground line-through">{ksh(p.original_price)}</span>
        <span className="text-sm font-semibold text-primary">{ksh(p.promo_price)}</span>
      </div>
      <p className="mt-1.5 truncate text-xs text-muted-foreground">
        {p.locations?.area} · {endsIn(p.ends_at)}
      </p>
    </Link>
  );
}

export { Logo };
