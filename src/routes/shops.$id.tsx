import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Globe, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PROMO_SELECT, type Promo } from "@/lib/data";
import { DealCard, Logo } from "@/components/DealCard";
import { FollowButton } from "@/components/Notify";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/shops/$id")({
  head: () => ({
    meta: [
      { title: "Shop deals — Pata" },
      { name: "description", content: "Every live deal and promotion from this shop on Pata." },
      { property: "og:title", content: "Shop deals — Pata" },
      { property: "og:description", content: "Every live deal and promotion from this shop on Pata." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { id } = Route.useParams();
  const { data: biz, isLoading } = useQuery({
    queryKey: ["shop", id],
    queryFn: async () =>
      (await supabase.from("businesses").select("id,name,logo_url,description,phone,website,address,categories(name,icon),locations(area,city)").eq("id", id).maybeSingle()).data as any,
  });
  const { data: deals } = useQuery({
    queryKey: ["shop-deals", id],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase.from("promotions").select(PROMO_SELECT).eq("business_id", id).eq("status", "approved").eq("is_flagged", false).gt("ends_at", now).order("is_featured", { ascending: false }).order("created_at", { ascending: false });
      return (data ?? []) as unknown as Promo[];
    },
  });
  const [cat, setCat] = useStateCat();

  if (isLoading) return <div className="mx-auto max-w-5xl p-4"><Skeleton className="h-40 rounded-2xl" /></div>;
  if (!biz) return <div className="p-8 text-center"><p className="font-semibold">Shop not found</p><Link to="/deals" className="text-primary">Browse deals</Link></div>;

  const cats = Array.from(new Set((deals ?? []).map((d) => d.categories?.name).filter(Boolean))) as string[];
  const shown = (deals ?? []).filter((d) => !cat || d.categories?.name === cat);

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <div className="glass flex flex-wrap items-center gap-4 p-4">
        <div className="scale-125"><Logo name={biz.name} url={biz.logo_url} /></div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{biz.name}</h1>
          <p className="text-xs text-muted-foreground">{biz.categories?.icon} {biz.categories?.name} · <MapPin className="inline size-3" /> {biz.locations?.area ?? biz.address}</p>
          <div className="mt-1 flex gap-3 text-xs">
            {biz.phone && <a href={`tel:${biz.phone}`} className="flex items-center gap-1 text-muted-foreground"><Phone className="size-3" />{biz.phone}</a>}
            {biz.website && <a href={biz.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary"><Globe className="size-3" />Website</a>}
          </div>
        </div>
        <FollowButton businessId={biz.id} name={biz.name} />
      </div>
      {biz.description && <p className="mt-3 text-sm text-muted-foreground">{biz.description}</p>}

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{deals?.length ?? 0} live {deals?.length === 1 ? "deal" : "deals"}</h2>
      </div>
      {cats.length > 1 && (
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
          {[null, ...cats].map((c) => (
            <button key={c ?? "all"} onClick={() => setCat(c)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${cat === c ? "bg-primary text-primary-foreground" : "bg-glass text-muted-foreground"}`}>{c ?? "All"}</button>
          ))}
        </div>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => <DealCard key={p.id} p={p} />)}
      </div>
      {deals && deals.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No live deals right now. Follow this shop to get alerted about new ones.</p>}
    </div>
  );
}

import { useState } from "react";
function useStateCat() { return useState<string | null>(null); }
