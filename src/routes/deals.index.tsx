import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Search, SlidersHorizontal } from "lucide-react";
import { activePromosQuery, categoriesQuery, locationsQuery } from "@/lib/data";
import { DealCard } from "@/components/DealCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().max(80).optional(),
  cat: z.string().optional(),
  area: z.string().optional(),
  sort: z.enum(["recommended", "popular", "newest", "discount", "ending"]).optional(),
  method: z.enum(["any", "instore", "online"]).optional(),
  maxPrice: z.coerce.number().optional(),
  minDiscount: z.coerce.number().optional(),
});

export const Route = createFileRoute("/deals/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Explore deals in Nairobi — Pata" },
      { name: "description", content: "Search and filter promotions by category, area, price, discount and expiry." },
      { property: "og:title", content: "Explore deals in Nairobi — Pata" },
      { property: "og:description", content: "Search every live promotion in Nairobi in one place." },
    ],
  }),
  component: Deals,
});

const sorts = [
  ["recommended", "Recommended"],
  ["popular", "Popular"],
  ["newest", "Newest"],
  ["discount", "Biggest Discount"],
  ["ending", "Ending Soon"],
] as const;

function Deals() {
  const s = Route.useSearch();
  const nav = useNavigate({ from: "/deals/" });
  const [q, setQ] = useState(s.q ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const { data, isLoading } = useQuery(activePromosQuery);
  const { data: cats } = useQuery(categoriesQuery);
  const { data: locs } = useQuery(locationsQuery);
  const set = (patch: Partial<typeof s>) => nav({ search: (prev) => ({ ...prev, ...patch }) });

  const results = useMemo(() => {
    let r = data ?? [];
    const term = (s.q ?? "").toLowerCase().trim();
    if (term)
      r = r.filter((p) =>
        [p.title, p.description, p.businesses?.name, p.categories?.name, p.locations?.area, ...(p.tags ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    if (s.cat) r = r.filter((p) => p.categories?.slug === s.cat);
    if (s.area) r = r.filter((p) => p.locations?.area === s.area);
    if (s.method === "online") r = r.filter((p) => p.redemption_method === "online");
    if (s.method === "instore") r = r.filter((p) => p.redemption_method !== "online");
    if (s.maxPrice) r = r.filter((p) => p.promo_price <= s.maxPrice!);
    if (s.minDiscount) r = r.filter((p) => (p.discount_pct ?? 0) >= s.minDiscount!);
    const sort = s.sort ?? "recommended";
    const by = {
      recommended: (a: any, b: any) => Number(b.is_featured) - Number(a.is_featured) || b.view_count - a.view_count,
      popular: (a: any, b: any) => b.view_count - a.view_count,
      newest: (a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at),
      discount: (a: any, b: any) => (b.discount_pct ?? 0) - (a.discount_pct ?? 0),
      ending: (a: any, b: any) => +new Date(a.ends_at) - +new Date(b.ends_at),
    }[sort];
    return [...r].sort(by);
  }, [data, s]);

  const sel = "tile w-full px-3 py-2.5 text-sm outline-none";

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <form className="glass flex gap-1.5 p-1.5" onSubmit={(e) => { e.preventDefault(); set({ q: q || undefined }); }}>
        <label className="tile flex flex-1 items-center gap-2 px-3 py-2.5">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} placeholder="pizza, gym, massage, date night…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>
        <button type="button" onClick={() => setShowFilters((v) => !v)} className="tile grid w-11 place-items-center" aria-label="Filters">
          <SlidersHorizontal className="size-4" />
        </button>
      </form>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {sorts.map(([k, l]) => (
          <button key={k} onClick={() => set({ sort: k })} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium", (s.sort ?? "recommended") === k ? "bg-primary text-primary-foreground" : "bg-glass text-muted-foreground")}>
            {l}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="glass mt-3 grid gap-2 p-3 sm:grid-cols-3 lg:grid-cols-5">
          <select className={sel} value={s.cat ?? ""} onChange={(e) => set({ cat: e.target.value || undefined })}>
            <option value="" className="bg-card">All categories</option>
            {cats?.map((c) => <option key={c.id} value={c.slug} className="bg-card">{c.icon} {c.name}</option>)}
          </select>
          <select className={sel} value={s.area ?? ""} onChange={(e) => set({ area: e.target.value || undefined })}>
            <option value="" className="bg-card">All of Nairobi</option>
            {locs?.map((l) => <option key={l.id} value={l.area} className="bg-card">{l.area}</option>)}
          </select>
          <select className={sel} value={s.method ?? "any"} onChange={(e) => set({ method: e.target.value as any })}>
            <option value="any" className="bg-card">Online & in-store</option>
            <option value="instore" className="bg-card">In-store</option>
            <option value="online" className="bg-card">Online</option>
          </select>
          <select className={sel} value={s.maxPrice ?? ""} onChange={(e) => set({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="" className="bg-card">Any price</option>
            {[1000, 2500, 5000, 10000].map((v) => <option key={v} value={v} className="bg-card">Under KSh {v.toLocaleString()}</option>)}
          </select>
          <select className={sel} value={s.minDiscount ?? ""} onChange={(e) => set({ minDiscount: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="" className="bg-card">Any discount</option>
            {[20, 30, 40, 50].map((v) => <option key={v} value={v} className="bg-card">{v}%+ off</option>)}
          </select>
        </div>
      )}

      <p className="mt-4 text-sm text-muted-foreground">{isLoading ? "Loading…" : `${results.length} deal${results.length === 1 ? "" : "s"}`}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
        {results.map((p) => <DealCard key={p.id} p={p} />)}
      </div>
      {!isLoading && !results.length && (
        <div className="glass mt-3 p-6 text-center text-sm text-muted-foreground">No deals match. Try a different search or clear filters.</div>
      )}
    </div>
  );
}
