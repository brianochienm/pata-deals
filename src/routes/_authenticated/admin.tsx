import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ksh } from "@/lib/format";
import { useRoles } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Pata" }, { name: "description", content: "Platform administration, approvals and commissions." }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useRoles();
  const qc = useQueryClient();
  const { data: exists } = useQuery({ queryKey: ["admin-exists"], enabled: !loading && !isAdmin, queryFn: async () => (await supabase.rpc("admin_exists")).data });
  if (loading) return <p className="p-8 text-center text-muted-foreground">Loading…</p>;
  if (!isAdmin)
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Admin only</h1>
        {exists === false ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">No admin has been set up yet. Claim admin access for this account.</p>
            <Button className="mt-4" onClick={async () => { await supabase.rpc("claim_first_admin"); qc.invalidateQueries(); }}>Become the admin</Button>
          </>
        ) : <p className="mt-2 text-sm text-muted-foreground">You don't have access to this area.</p>}
      </div>
    );
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <Tabs defaultValue="overview" className="mt-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Analytics</TabsTrigger>
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
          <TabsTrigger value="promos">Promotions</TabsTrigger>
          <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="settings">Commission</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><Analytics /></TabsContent>
        <TabsContent value="businesses"><Businesses /></TabsContent>
        <TabsContent value="promos"><Promos /></TabsContent>
        <TabsContent value="redemptions"><Redemptions /></TabsContent>
        <TabsContent value="disputes"><Disputes /></TabsContent>
        <TabsContent value="settings"><Settings /></TabsContent>
      </Tabs>
    </div>
  );
}

const useAll = () => {
  const reds = useQuery({ queryKey: ["admin-reds"], queryFn: async () => (await supabase.from("redemptions").select("*, promotions(title, categories(name), locations(area)), businesses(name)").order("created_at", { ascending: false })).data ?? [] });
  const biz = useQuery({ queryKey: ["admin-biz"], queryFn: async () => (await supabase.from("businesses").select("*, categories(name), locations(area)").order("created_at", { ascending: false })).data ?? [] });
  const promos = useQuery({ queryKey: ["admin-promos"], queryFn: async () => (await supabase.from("promotions").select("*, businesses(name)").order("created_at", { ascending: false })).data ?? [] });
  return { reds: reds.data ?? [], biz: biz.data ?? [], promos: promos.data ?? [] };
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="glass p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>;
}

function topBy<T>(rows: T[], key: (r: T) => string | undefined, val: (r: T) => number) {
  const m = new Map<string, number>();
  rows.forEach((r) => { const k = key(r); if (k) m.set(k, (m.get(k) ?? 0) + val(r)); });
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
}

function Chart({ title, data, money }: { title: string; data: { name: string; value: number }[]; money?: boolean }) {
  return (
    <div className="glass p-3">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      {data.length ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip formatter={(v: any) => (money ? ksh(v) : v)} contentStyle={{ background: "var(--card)", border: "none", borderRadius: 8 }} />
            <Bar dataKey="value" fill="var(--primary)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <p className="text-sm text-muted-foreground">No data yet.</p>}
    </div>
  );
}

function Analytics() {
  const { reds, biz, promos } = useAll();
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: async () => (await supabase.rpc("admin_user_count")).data ?? 0 });
  const done = reds.filter((r) => r.status === "completed");
  const gross = done.reduce((a, r) => a + Number(r.transaction_value ?? 0), 0);
  const comm = done.reduce((a, r) => a + Number(r.commission_amount ?? 0), 0);
  const paid = done.filter((r) => r.commission_paid).reduce((a, r) => a + Number(r.commission_amount ?? 0), 0);
  const activeUsers = new Set(reds.filter((r) => Date.now() - +new Date(r.created_at) < 30 * 864e5).map((r) => r.user_id)).size;
  const now = Date.now();
  return (
    <div className="mt-3 grid gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label="Total users" value={users ?? 0} />
        <Stat label="Active users (30d)" value={activeUsers} />
        <Stat label="Businesses" value={biz.length} />
        <Stat label="Active promotions" value={promos.filter((p) => p.status === "approved" && +new Date(p.ends_at) > now).length} />
        <Stat label="Total redemptions" value={reds.length} />
        <Stat label="Completed transactions" value={done.length} />
        <Stat label="Gross transaction value" value={ksh(gross)} />
        <Stat label="Platform commission" value={ksh(comm)} />
        <Stat label="Pending commission" value={ksh(comm - paid)} />
        <Stat label="Paid commission" value={ksh(paid)} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Chart title="Top businesses (commission)" data={topBy(done, (r: any) => r.businesses?.name, (r) => Number(r.commission_amount ?? 0))} money />
        <Chart title="Top promotions (redemptions)" data={topBy(reds, (r: any) => r.promotions?.title, () => 1)} />
        <Chart title="Popular categories (redemptions)" data={topBy(reds, (r: any) => r.promotions?.categories?.name, () => 1)} />
        <Chart title="Most active locations (redemptions)" data={topBy(reds, (r: any) => r.promotions?.locations?.area, () => 1)} />
      </div>
    </div>
  );
}

const badge = (s: string) => `rounded-full px-2 py-1 text-xs capitalize ${s === "approved" || s === "completed" || s === "resolved" ? "pill-cyan" : s === "pending" || s === "open" || s === "available" ? "pill-gold" : "pill-coral"}`;

function Businesses() {
  const { biz } = useAll();
  const qc = useQueryClient();
  const upd = async (id: string, patch: any) => {
    const { error } = await supabase.from("businesses").update(patch).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-biz"] }); }
  };
  return (
    <div className="mt-3 grid gap-2">
      {biz.map((b: any) => (
        <div key={b.id} className="glass grid gap-2 p-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0">
            <p className="font-semibold">{b.name} <span className={badge(b.status)}>{b.status}</span></p>
            <p className="text-xs text-muted-foreground">{b.categories?.name} · {b.locations?.area} · {b.contact_person ?? "—"} · {b.phone ?? ""} · {b.email ?? ""}</p>
            {b.verification_info && <p className="text-xs text-muted-foreground">Verification: {b.verification_info}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="h-8 w-24" type="number" step="0.5" placeholder="Rate %" defaultValue={b.commission_rate ?? ""} onBlur={(e) => { const v = e.target.value; if (String(b.commission_rate ?? "") !== v) upd(b.id, { commission_rate: v === "" ? null : Number(v) }); }} />
            {b.status !== "approved" && <Button size="sm" onClick={() => upd(b.id, { status: "approved", rejection_reason: null })}>Approve</Button>}
            {b.status !== "rejected" && <Button size="sm" variant="secondary" onClick={() => { const r = window.prompt("Reason for rejection?") ?? ""; upd(b.id, { status: "rejected", rejection_reason: r.slice(0, 500) || null }); }}>Reject</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Promos() {
  const { promos } = useAll();
  const qc = useQueryClient();
  const upd = async (id: string, patch: any) => {
    const { error } = await supabase.from("promotions").update(patch).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries();
  };
  const del = async (id: string) => {
    if (!window.confirm("Remove this promotion?")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) toast.error(error.code === "23503" ? "It has redemptions — flag it instead" : error.message); else qc.invalidateQueries();
  };
  return (
    <div className="mt-3 grid gap-2">
      {promos.map((p: any) => (
        <div key={p.id} className="glass grid gap-2 p-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0">
            <Link to="/deals/$id" params={{ id: p.id }} className="font-semibold">{p.title}</Link>{" "}
            <span className={badge(p.status)}>{p.status}</span>
            {p.is_featured && <span className="ml-1 pill-gold rounded-full px-2 py-1 text-xs">featured</span>}
            {p.is_flagged && <span className="ml-1 pill-coral rounded-full px-2 py-1 text-xs">flagged</span>}
            <p className="text-xs text-muted-foreground">{p.businesses?.name} · {ksh(p.promo_price)} ({p.discount_pct}% off) · {p.view_count} views</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.status !== "approved" && <Button size="sm" onClick={() => upd(p.id, { status: "approved" })}>Approve</Button>}
            {p.status !== "rejected" && <Button size="sm" variant="secondary" onClick={() => upd(p.id, { status: "rejected" })}>Reject</Button>}
            <Button size="sm" variant="secondary" onClick={() => upd(p.id, { is_featured: !p.is_featured })}>{p.is_featured ? "Unfeature" : "Feature"}</Button>
            <Button size="sm" variant="secondary" onClick={() => upd(p.id, { is_flagged: !p.is_flagged })}>{p.is_flagged ? "Unflag" : "Flag"}</Button>
            <Button size="sm" variant="ghost" onClick={() => del(p.id)}>Remove</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Redemptions() {
  const { reds } = useAll();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const rows = filter === "all" ? reds : reds.filter((r) => r.status === filter);
  const upd = async (id: string, patch: any) => {
    const { error } = await supabase.from("redemptions").update(patch).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-reds"] });
  };
  const exportCsv = () => {
    const head = ["code", "business", "promotion", "status", "created_at", "completed_at", "transaction_value", "commission_rate", "commission_amount", "commission_paid"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((r: any) => [r.code, r.businesses?.name, r.promotions?.title, r.status, r.created_at, r.completed_at, r.transaction_value, r.commission_rate, r.commission_amount, r.commission_paid].map(esc).join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pata-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        {["all", "available", "completed", "reversed"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-xs capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-glass"}`}>{s}</button>
        ))}
        <Button size="sm" variant="secondary" className="ml-auto" onClick={exportCsv}>Export CSV</Button>
      </div>
      <div className="mt-3 grid gap-2">
        {rows.map((r: any) => (
          <div key={r.id} className="glass grid gap-2 p-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <p className="font-medium">{r.code} · {r.promotions?.title} <span className={badge(r.status)}>{r.status}</span></p>
              <p className="text-xs text-muted-foreground">{r.businesses?.name} · {new Date(r.created_at).toLocaleString("en-KE")}
                {r.transaction_value != null && ` · ${ksh(r.transaction_value)} @ ${r.commission_rate}% = ${ksh(r.commission_amount)}`}</p>
            </div>
            <div className="flex gap-2">
              {r.status === "completed" && !r.commission_paid && <Button size="sm" onClick={() => upd(r.id, { commission_paid: true, commission_paid_at: new Date().toISOString() })}>Mark paid</Button>}
              {r.commission_paid && <span className="pill-cyan rounded-full px-2 py-1 text-xs">paid</span>}
              {r.status !== "reversed" && <Button size="sm" variant="ghost" onClick={() => window.confirm("Reverse this transaction?") && upd(r.id, { status: "reversed", commission_amount: 0 })}>Reverse</Button>}
            </div>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-muted-foreground">Nothing here.</p>}
      </div>
    </div>
  );
}

function Disputes() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-disputes"], queryFn: async () => (await supabase.from("disputes").select("*, promotions(title)").order("created_at", { ascending: false })).data ?? [] });
  const upd = async (id: string, status: "investigating" | "resolved" | "rejected") => {
    const { error } = await supabase.from("disputes").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-disputes"] });
  };
  return (
    <div className="mt-3 grid gap-2">
      {data?.map((d: any) => (
        <div key={d.id} className="glass p-3 text-sm">
          <p className="font-medium">{d.promotions?.title ?? "Redemption issue"} <span className={badge(d.status)}>{d.status}</span></p>
          <p className="mt-1 text-muted-foreground">{d.reason}</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => upd(d.id, "investigating")}>Investigating</Button>
            <Button size="sm" onClick={() => upd(d.id, "resolved")}>Resolve</Button>
            <Button size="sm" variant="ghost" onClick={() => upd(d.id, "rejected")}>Dismiss</Button>
          </div>
        </div>
      ))}
      {!data?.length && <p className="text-sm text-muted-foreground">No disputes.</p>}
    </div>
  );
}

function Settings() {
  const qc = useQueryClient();
  const { data: s } = useQuery({ queryKey: ["settings"], queryFn: async () => (await supabase.from("platform_settings").select("*").eq("id", 1).single()).data });
  const { data: cats } = useQuery({ queryKey: ["admin-cats"], queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [] });
  const [newCat, setNewCat] = useState("");
  const saveDefault = async (v: string) => {
    const n = Number(v);
    if (!(n >= 0 && n <= 100)) { toast.error("Enter 0–100"); return; }
    const { error } = await supabase.from("platform_settings").update({ default_commission_rate: n, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) toast.error(error.message); else { toast.success("Default rate saved"); qc.invalidateQueries({ queryKey: ["settings"] }); }
  };
  const saveCat = async (id: string, v: string) => {
    const { error } = await supabase.from("categories").update({ commission_rate: v === "" ? null : Number(v) }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Saved");
  };
  const addCat = async () => {
    const name = newCat.trim().slice(0, 60);
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { error } = await supabase.from("categories").insert({ name, slug, sort_order: 99 });
    if (error) toast.error(error.message); else { setNewCat(""); qc.invalidateQueries(); }
  };
  return (
    <div className="mt-3 grid max-w-xl gap-3">
      <div className="glass p-4">
        <p className="text-sm font-semibold">Default commission rate</p>
        <p className="text-xs text-muted-foreground">Used unless a business or category has its own rate. Priority: business → category → default.</p>
        {s && <div className="mt-2 flex gap-2"><Input type="number" step="0.5" defaultValue={s.default_commission_rate} id="defrate" className="w-28" /><Button onClick={() => saveDefault((document.getElementById("defrate") as HTMLInputElement).value)}>Save</Button></div>}
      </div>
      <div className="glass p-4">
        <p className="text-sm font-semibold">Categories & category rates</p>
        <div className="mt-2 grid gap-2">
          {cats?.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{c.icon} {c.name}</span>
              <Input type="number" step="0.5" placeholder="default" className="h-8 w-24" defaultValue={c.commission_rate ?? ""} onBlur={(e) => { if (String(c.commission_rate ?? "") !== e.target.value) saveCat(c.id, e.target.value); }} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2"><Input placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} /><Button variant="secondary" onClick={addCat}>Add</Button></div>
      </div>
    </div>
  );
}
