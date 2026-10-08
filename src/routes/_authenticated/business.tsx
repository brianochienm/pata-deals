import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, locationsQuery, uploadImage } from "@/lib/data";
import { ksh, methodLabel } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/business")({
  head: () => ({ meta: [{ title: "Business dashboard — Pata" }, { name: "description", content: "Manage your promotions, verify codes and track commissions." }] }),
  component: BusinessPage,
});

const sel = "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm";
const opt = "bg-card";

function BusinessPage() {
  const { user } = useAuth();
  const { data: biz, isLoading } = useQuery({
    queryKey: ["my-business", user?.id],
    queryFn: async () => (await supabase.from("businesses").select("*").eq("owner_id", user!.id).maybeSingle()).data,
  });
  if (isLoading) return <p className="p-8 text-center text-muted-foreground">Loading…</p>;
  if (!biz) return <Onboarding />;
  if (biz.status !== "approved")
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">{biz.status === "pending" ? "Your business is under review." : "Application not approved"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {biz.status === "pending" ? "We'll approve your account shortly. You can create promotions once approved." : biz.rejection_reason ?? "Contact us for details."}
        </p>
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold">{biz.name}</h1>
      <p className="text-sm text-muted-foreground">Business dashboard</p>
      <Tabs defaultValue="verify" className="mt-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="verify">Verify code</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="promos">Promotions</TabsTrigger>
          <TabsTrigger value="new">New promotion</TabsTrigger>
        </TabsList>
        <TabsContent value="verify"><Verify /></TabsContent>
        <TabsContent value="overview"><Overview businessId={biz.id} /></TabsContent>
        <TabsContent value="promos"><MyPromos businessId={biz.id} /></TabsContent>
        <TabsContent value="new"><PromoForm business={biz} /></TabsContent>
      </Tabs>
    </div>
  );
}

const bizSchema = z.object({
  name: z.string().trim().min(2, "Business name required").max(120),
  category_id: z.string().uuid("Choose a category"),
  location_id: z.string().uuid("Choose a location"),
  contact_person: z.string().trim().min(2, "Contact person required").max(100),
  phone: z.string().trim().min(7, "Phone required").max(30),
  email: z.string().trim().email("Valid email required").max(255),
  description: z.string().trim().max(1000),
  website: z.string().trim().max(255),
  instagram: z.string().trim().max(255),
  address: z.string().trim().max(255),
  payout_details: z.string().trim().max(500),
  verification_info: z.string().trim().max(500),
});

function Onboarding() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: cats } = useQuery(categoriesQuery);
  const { data: locs } = useQuery(locationsQuery);
  const [f, setF] = useState<any>({ email: user?.email ?? "" });
  const [logo, setLogo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const field = (k: string, ph: string) => <Input placeholder={ph} value={f[k] ?? ""} onChange={set(k)} />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = bizSchema.safeParse(Object.fromEntries(Object.keys(bizSchema.shape).map((k) => [k, f[k] ?? ""])));
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check the form"); return; }
    setBusy(true);
    try {
      const logo_url = logo ? await uploadImage(user!.id, logo) : null;
      const d = parsed.data;
      const { error } = await supabase.rpc("register_business", {
        _name: d.name, _category_id: d.category_id, _location_id: d.location_id, _description: d.description,
        _contact_person: d.contact_person, _phone: d.phone, _email: d.email, _website: d.website, _instagram: d.instagram,
        _address: d.address, _payout_details: d.payout_details, _verification_info: d.verification_info, _logo_url: logo_url as any,
      });
      if (error) throw error;
      toast.success("Submitted! Your business is under review.");
      qc.invalidateQueries();
    } catch (err: any) { toast.error(err.message); }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-semibold">List Your Promotion — Free</h1>
      <p className="text-sm text-muted-foreground">Tell us about your business. Listing is free — a small commission applies only to verified sales.</p>
      <form onSubmit={submit} className="glass mt-5 grid gap-2 p-4">
        {field("name", "Business name *")}
        <select className={sel} value={f.category_id ?? ""} onChange={set("category_id")}>
          <option value="" className={opt}>Business category *</option>
          {cats?.map((c) => <option key={c.id} value={c.id} className={opt}>{c.name}</option>)}
        </select>
        <select className={sel} value={f.location_id ?? ""} onChange={set("location_id")}>
          <option value="" className={opt}>Location *</option>
          {locs?.map((l) => <option key={l.id} value={l.id} className={opt}>{l.city} → {l.area}</option>)}
        </select>
        {field("contact_person", "Contact person *")}
        <div className="grid grid-cols-2 gap-2">{field("phone", "Phone *")}{field("email", "Email *")}</div>
        <Textarea placeholder="Business description" value={f.description ?? ""} onChange={set("description")} maxLength={1000} />
        {field("address", "Street address")}
        <div className="grid grid-cols-2 gap-2">{field("website", "Website")}{field("instagram", "Instagram / TikTok")}</div>
        {field("payout_details", "Payment info for settlement (e.g. M-Pesa till)")}
        {field("verification_info", "Verification (KRA PIN / business reg. no.)")}
        <label className="text-sm text-muted-foreground">Logo <input type="file" accept="image/*" className="mt-1 block text-sm" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} /></label>
        <Button type="submit" disabled={busy} className="mt-2">{busy ? "Submitting…" : "Submit for review"}</Button>
      </form>
    </div>
  );
}

function Scanner({ onCode }: { onCode: (c: string) => void }) {
  const ref = useRef<any>(null);
  useEffect(() => {
    let stopped = false;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (stopped) return;
      const s = new Html5Qrcode("qr-reader");
      ref.current = s;
      s.start({ facingMode: "environment" }, { fps: 10, qrbox: 220 }, (text) => { onCode(text); s.stop().catch(() => {}); }, () => {})
        .catch(() => toast.error("Camera unavailable — enter the code manually"));
    });
    return () => { stopped = true; ref.current?.stop?.().catch(() => {}); };
  }, [onCode]);
  return <div id="qr-reader" className="mt-3 overflow-hidden rounded-xl" />;
}

function Verify() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const [found, setFound] = useState<any>(null);
  const [scan, setScan] = useState(false);

  const lookup = async (c = code) => {
    const { data, error } = await supabase.rpc("lookup_redemption", { _code: c.trim() });
    if (error) { toast.error(error.message); return; }
    const r = (data as any[])?.[0];
    if (!r) { setFound(null); toast.error("Code not found for your business"); return; }
    setFound(r);
    setValue(String(r.promo_price));
  };
  const confirm = async () => {
    const { error } = await supabase.rpc("confirm_redemption", { _code: found.code, _transaction_value: Number(value) });
    if (error) { toast.error(error.message); return; }
    toast.success("Redemption confirmed");
    setFound(null); setCode(""); setValue("");
    qc.invalidateQueries({ queryKey: ["biz-redemptions"] });
  };

  return (
    <div className="glass mt-3 max-w-md p-4">
      <p className="text-sm font-semibold">Verify a customer's code</p>
      <div className="mt-2 flex gap-2">
        <Input placeholder="DEAL-XXXXX" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={20} />
        <Button onClick={() => lookup()}>Check</Button>
      </div>
      <Button variant="secondary" size="sm" className="mt-2" onClick={() => setScan((s) => !s)}>{scan ? "Close scanner" : "Scan QR code"}</Button>
      {scan && <Scanner onCode={(c) => { setScan(false); setCode(c); lookup(c); }} />}
      {found && (
        <div className="mt-4 rounded-xl bg-glass p-3 text-sm">
          <p className="font-semibold">{found.promotion_title}</p>
          <p className="text-muted-foreground">Customer: {found.customer_name ?? "—"} · Status: <span className="capitalize">{found.status}</span></p>
          {found.status === "available" ? (
            <>
              <label className="mt-3 block text-xs text-muted-foreground">Transaction value (KSh)</label>
              <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
              <Button className="mt-2 w-full" onClick={confirm}>Confirm redemption</Button>
            </>
          ) : <p className="mt-2 text-coral">This code has already been used.</p>}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="glass p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>;
}

function Overview({ businessId }: { businessId: string }) {
  const { data: reds } = useQuery({
    queryKey: ["biz-redemptions", businessId],
    queryFn: async () => (await supabase.from("redemptions").select("*, promotions(title)").eq("business_id", businessId).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: promos } = useQuery({
    queryKey: ["biz-promos", businessId],
    queryFn: async () => (await supabase.from("promotions").select("view_count").eq("business_id", businessId)).data ?? [],
  });
  const r = reds ?? [];
  const done = r.filter((x) => x.status === "completed");
  const gross = done.reduce((a, x) => a + Number(x.transaction_value ?? 0), 0);
  const owed = done.reduce((a, x) => a + Number(x.commission_amount ?? 0), 0);
  const paid = done.filter((x) => x.commission_paid).reduce((a, x) => a + Number(x.commission_amount ?? 0), 0);
  return (
    <div className="mt-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Views" value={(promos ?? []).reduce((a, p) => a + p.view_count, 0)} />
        <Stat label="Total claims" value={r.length} />
        <Stat label="Completed transactions" value={done.length} />
        <Stat label="Gross sales generated" value={ksh(gross)} />
        <Stat label="Commission rate" value={done[0]?.commission_rate ? `${done[0].commission_rate}%` : "5%"} />
        <Stat label="Commission owed" value={ksh(owed)} />
        <Stat label="Commission paid" value={ksh(paid)} />
        <Stat label="Outstanding balance" value={ksh(owed - paid)} />
      </div>
      <h3 className="mt-5 text-sm font-semibold">Recent redemptions</h3>
      <div className="mt-2 grid gap-2">
        {r.slice(0, 20).map((x: any) => (
          <div key={x.id} className="glass flex items-center justify-between p-3 text-sm">
            <div><p className="font-medium">{x.promotions?.title}</p><p className="text-xs text-muted-foreground">{x.code} · {new Date(x.created_at).toLocaleString("en-KE")}</p></div>
            <div className="text-right"><p className="capitalize">{x.status}</p>{x.transaction_value != null && <p className="text-xs text-muted-foreground">{ksh(x.transaction_value)}</p>}</div>
          </div>
        ))}
        {!r.length && <p className="text-sm text-muted-foreground">No redemptions yet.</p>}
      </div>
    </div>
  );
}

function MyPromos({ businessId }: { businessId: string }) {
  const { data } = useQuery({
    queryKey: ["biz-promo-list", businessId],
    queryFn: async () => (await supabase.from("promotions").select("*").eq("business_id", businessId).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="mt-3 grid gap-2">
      {data?.map((p) => (
        <div key={p.id} className="glass flex items-center justify-between gap-3 p-3 text-sm">
          <div className="min-w-0">
            <Link to="/deals/$id" params={{ id: p.id }} className="truncate font-medium">{p.title}</Link>
            <p className="text-xs text-muted-foreground">{ksh(p.promo_price)} · {p.view_count} views · ends {new Date(p.ends_at).toLocaleDateString("en-KE")}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-xs capitalize ${p.status === "approved" ? "pill-cyan" : p.status === "pending" ? "pill-gold" : "pill-coral"}`}>{p.is_flagged ? "flagged" : p.status}</span>
        </div>
      ))}
      {!data?.length && <p className="text-sm text-muted-foreground">No promotions yet — create your first one.</p>}
    </div>
  );
}

const promoSchema = z.object({
  title: z.string().trim().min(3, "Title required").max(120),
  description: z.string().trim().max(2000),
  original_price: z.coerce.number().positive("Original price required"),
  promo_price: z.coerce.number().min(0, "Promotional price required"),
  starts_at: z.string().min(1, "Start date required"),
  ends_at: z.string().min(1, "Expiry date required"),
  max_redemptions: z.string(),
  redemption_method: z.enum(["coupon", "qr", "online", "booking", "claim"]),
  online_url: z.string().trim().max(500),
  terms: z.string().trim().max(2000),
  instructions: z.string().trim().max(1000),
  location_id: z.string().uuid("Choose a location"),
  tags: z.string().max(200),
});

function PromoForm({ business }: { business: any }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: locs } = useQuery(locationsQuery);
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState<any>({ redemption_method: "qr", starts_at: today, location_id: business.location_id ?? "" });
  const [img, setImg] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const op = Number(f.original_price || 0), pp = Number(f.promo_price || 0);
  const pct = op > 0 && pp >= 0 ? Math.round((1 - pp / op) * 100) : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = promoSchema.safeParse(Object.fromEntries(Object.keys(promoSchema.shape).map((k) => [k, f[k] ?? ""])));
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check the form"); return; }
    const d = parsed.data;
    if (d.promo_price > d.original_price) { toast.error("Promotional price must be below the original price"); return; }
    setBusy(true);
    try {
      const image_url = img ? await uploadImage(user!.id, img) : null;
      const { error } = await supabase.from("promotions").insert({
        business_id: business.id, category_id: business.category_id, location_id: d.location_id,
        title: d.title, description: d.description || null, image_url,
        original_price: d.original_price, promo_price: d.promo_price,
        starts_at: new Date(d.starts_at).toISOString(), ends_at: new Date(d.ends_at + "T23:59:59").toISOString(),
        max_redemptions: d.max_redemptions ? Math.max(1, parseInt(d.max_redemptions)) : null,
        redemption_method: d.redemption_method, online_url: d.online_url || null,
        terms: d.terms || null, instructions: d.instructions || null,
        tags: d.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 10),
      });
      if (error) throw error;
      toast.success("Promotion submitted for approval");
      setF({ redemption_method: "qr", starts_at: today, location_id: business.location_id ?? "" });
      setImg(null);
      qc.invalidateQueries({ queryKey: ["biz-promo-list"] });
    } catch (err: any) { toast.error(err.message); }
    setBusy(false);
  };

  const inp = (k: string, ph: string, type = "text") => <Input type={type} placeholder={ph} value={f[k] ?? ""} onChange={set(k)} />;
  return (
    <form onSubmit={submit} className="glass mt-3 grid max-w-2xl gap-2 p-4">
      {inp("title", "Promotion title *")}
      <Textarea placeholder="Description" value={f.description ?? ""} onChange={set("description")} maxLength={2000} />
      <div className="grid grid-cols-2 gap-2">{inp("original_price", "Original price (KSh) *", "number")}{inp("promo_price", "Promo price (KSh) *", "number")}</div>
      {op > 0 && <p className="text-xs text-gold">Discount: {pct}% off</p>}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">Start date{inp("starts_at", "", "date")}</label>
        <label className="text-xs text-muted-foreground">Expiry date *{inp("ends_at", "", "date")}</label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {inp("max_redemptions", "Available redemptions (blank = unlimited)", "number")}
        <select className={sel} value={f.location_id} onChange={set("location_id")}>
          <option value="" className={opt}>Location *</option>
          {locs?.map((l) => <option key={l.id} value={l.id} className={opt}>{l.area}</option>)}
        </select>
      </div>
      <select className={sel} value={f.redemption_method} onChange={set("redemption_method")}>
        {Object.entries(methodLabel).map(([k, l]) => <option key={k} value={k} className={opt}>{l}</option>)}
      </select>
      {(f.redemption_method === "online" || f.redemption_method === "booking") && inp("online_url", "Website / booking link")}
      <Textarea placeholder="Redemption instructions" value={f.instructions ?? ""} onChange={set("instructions")} maxLength={1000} />
      <Textarea placeholder="Terms & conditions" value={f.terms ?? ""} onChange={set("terms")} maxLength={2000} />
      {inp("tags", "Search tags, comma separated (e.g. lunch, date night)")}
      <label className="text-sm text-muted-foreground">Promotional image <input type="file" accept="image/*" className="mt-1 block text-sm" onChange={(e) => setImg(e.target.files?.[0] ?? null)} /></label>
      <Button type="submit" disabled={busy} className="mt-2">{busy ? "Submitting…" : "Submit for approval"}</Button>
    </form>
  );
}
