import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { activePromosQuery, categoriesQuery, locationsQuery, type Promo } from "@/lib/data";
import { DealCard, MiniDealCard } from "@/components/DealCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pata — All the best deals. One place." },
      { name: "description", content: "Discover promotions, discounts and exclusive offers from Nairobi businesses — without searching dozens of social pages." },
      { property: "og:title", content: "Pata — All the best deals. One place." },
      { property: "og:description", content: "Find, redeem and save on Nairobi's best deals in one place." },
    ],
  }),
  component: Home,
});

function Section({ title, to, children }: { title: string; to?: "popular" | "ending" | "newest"; children: React.ReactNode }) {
  return (
    <section className="px-4 pb-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {to && <Link to="/deals" search={{ sort: to }} className="text-xs text-primary">See all</Link>}
      </div>
      {children}
    </section>
  );
}

function Bento({ items }: { items: Promo[] }) {
  if (!items.length) return <p className="glass p-4 text-sm text-muted-foreground">No deals here yet.</p>;
  const first = items[0]!; const rest = items.slice(1);
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <DealCard p={first} />
      <div className="grid grid-cols-2 gap-2">
        {rest.slice(0, 2).map((p) => <MiniDealCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}

function Home() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const { data: promos, isLoading } = useQuery(activePromosQuery);
  const { data: cats } = useQuery(categoriesQuery);
  const { data: locs } = useQuery(locationsQuery);
  const all = promos ?? [];
  const trending = [...all].sort((a, b) => b.view_count - a.view_count);
  const ending = [...all].sort((a, b) => +new Date(a.ends_at) - +new Date(b.ends_at));
  const newest = [...all].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const near = area ? all.filter((p) => p.locations?.area === area) : all.filter((p) => p.locations?.area === "Westlands");

  const go = () => nav({ to: "/deals", search: { q: q || undefined, area: area || undefined } });

  return (
    <div className="mx-auto max-w-6xl">
      <section className="grid gap-6 px-4 pb-6 pt-6 md:grid-cols-2 md:items-center md:pt-12">
        <div>
          <h1 className="max-w-[16ch] text-4xl font-semibold leading-[1.05] text-balance md:text-6xl">
            All the best deals. One place.
          </h1>
          <p className="mt-3 max-w-[44ch] text-base text-muted-foreground text-pretty">
            Discover promotions, discounts and exclusive offers from businesses around you — without searching through dozens of social media pages.
          </p>
        </div>
        <form className="glass p-1.5" onSubmit={(e) => { e.preventDefault(); go(); }}>
          <label className="tile flex items-center gap-2 px-3 py-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} placeholder="What are you looking for?" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </label>
          <label className="tile mt-1.5 flex items-center gap-2 px-3 py-2.5">
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Where?</span>
            <select value={area} onChange={(e) => setArea(e.target.value)} className="ml-auto bg-transparent text-right text-sm text-primary outline-none">
              <option value="" className="bg-card">Nairobi — all areas</option>
              {locs?.map((l) => <option key={l.id} value={l.area} className="bg-card">{l.area}</option>)}
            </select>
          </label>
          <Button type="submit" className="mt-1.5 w-full">Explore Deals</Button>
        </form>
      </section>

      {isLoading ? (
        <div className="grid gap-2 px-4 md:grid-cols-2"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>
      ) : (
        <>
          <Section title="Trending Deals" to="popular"><Bento items={trending} /></Section>
          <Section title="Ending Soon" to="ending"><Bento items={ending} /></Section>
          <Section title={`Near You${area ? ` · ${area}` : " · Westlands"}`}><Bento items={near} /></Section>
          <Section title="New Offers" to="newest"><Bento items={newest} /></Section>
        </>
      )}

      <Section title="Browse by Category">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {cats?.map((c) => (
            <Link key={c.id} to="/deals" search={{ cat: c.slug }} className="glass p-3 text-center transition hover:bg-accent">
              <div className="mx-auto grid size-10 place-items-center rounded-[10px] bg-glass text-lg">{c.icon}</div>
              <p className="mt-2 line-clamp-1 text-xs font-medium">{c.name}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="How It Works">
        <div className="glass grid gap-4 p-4 md:grid-cols-3">
          {[
            ["1", "Discover", "Find offers from businesses in one place.", "pill-cyan"],
            ["2", "Redeem", "Claim the offer and receive your unique code or QR code.", "pill-coral"],
            ["3", "Save", "Enjoy the deal and pay less.", "pill-gold"],
          ].map(([n, t, d, tone]) => (
            <div key={n} className="flex items-start gap-3">
              <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${tone}`}>{n}</span>
              <div><p className="text-sm font-semibold">{t}</p><p className="text-xs text-muted-foreground">{d}</p></div>
            </div>
          ))}
        </div>
      </Section>

      <section className="px-4 pb-8">
        <div className="glass p-6 text-center md:p-10">
          <p className="mx-auto max-w-[28ch] text-lg font-semibold text-balance md:text-2xl">
            Have an offer? Put it in front of thousands of potential customers.
          </p>
          <p className="mx-auto mt-2 max-w-[40ch] text-sm text-muted-foreground">No listing fee, no upfront cost. You only pay a small commission when a deal brings you a sale.</p>
          <Button asChild className="mt-4 w-full md:w-auto"><Link to="/for-business">List Your Promotion — Free</Link></Button>
        </div>
      </section>
    </div>
  );
}
