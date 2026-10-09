import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DealCard } from "@/components/DealCard";
import { activePromosQuery } from "@/lib/data";
import { findDeals, type FinderResult } from "@/lib/finder.functions";

export const Route = createFileRoute("/finder")({
  head: () => ({
    meta: [
      { title: "AI Deal Finder — Pata" },
      { name: "description", content: "Describe what you want and Pata's AI finds matching Nairobi deals." },
      { property: "og:title", content: "AI Deal Finder — Pata" },
      { property: "og:description", content: "Tell Pata what you're looking for and get matching deals explained." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Finder,
});

const EXAMPLES = [
  "Date night dinner in Westlands under KSh 3,000",
  "Cheap haircut or spa near Kilimani this weekend",
  "Gym or fitness deal for a beginner",
];

function Finder() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<FinderResult | null>(null);
  const { data: promos = [] } = useQuery(activePromosQuery);

  async function run(text = q) {
    if (text.trim().length < 3 || busy) return;
    setQ(text);
    setBusy(true);
    setRes(null);
    try {
      setRes(await findDeals({ data: { query: text } }));
    } catch {
      setRes({ summary: "", matches: [], error: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  const byId = new Map(promos.map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="glass rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary"><Sparkles className="size-5" /><span className="text-sm font-semibold">AI Deal Finder</span></div>
        <h1 className="text-3xl font-bold">What are you looking for?</h1>
        <p className="text-muted-foreground">Describe it in your own words — budget, area, occasion — and we'll pick the best live offers for you.</p>
        <form onSubmit={(e) => { e.preventDefault(); run(); }} className="space-y-3">
          <Textarea value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} rows={3}
            placeholder="e.g. A family lunch in Karen for 4 people under KSh 5,000" />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={busy || q.trim().length < 3}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Find deals
            </Button>
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => run(ex)} className="pill text-xs">{ex}</button>
            ))}
          </div>
        </form>
      </div>

      {busy && <p className="text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Looking through Pata's deals…</p>}
      {res?.error && <p className="text-destructive">{res.error}</p>}
      {res && !res.error && (
        <div className="space-y-4">
          {res.summary && <p className="text-lg">{res.summary}</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {res.matches.map((m) => {
              const p = byId.get(m.id);
              if (!p) return null;
              return (
                <div key={m.id} className="space-y-2">
                  <DealCard p={p} />
                  <p className="text-sm text-muted-foreground flex gap-2"><Sparkles className="size-4 shrink-0 text-primary mt-0.5" />{m.reason}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
