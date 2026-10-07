import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/account");

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — Pata" },
      { name: "description", content: "Sign in or create a Pata account to redeem and save deals." },
      { property: "og:title", content: "Sign in — Pata" },
      { property: "og:description", content: "Sign in to redeem and save Nairobi deals." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  name: z.string().trim().max(100).optional(),
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const target = safePath(redirect);
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user) {
      sessionStorage.removeItem("auth_redirect");
      nav({ to: target as any, replace: true });
    }
  }, [user, target, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { emailRedirectTo: window.location.origin + target, data: { full_name: parsed.data.name } },
      });
      if (error) toast.error(error.message);
      else setSent(true);
    }
    setBusy(false);
  };

  const google = async () => {
    sessionStorage.setItem("auth_redirect", target);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth?redirect=" + encodeURIComponent(target) });
    if (r.error) toast.error("Google sign-in failed");
  };

  if (sent)
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to {form.email}. Click it to finish creating your account.</p>
      </div>
    );

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="text-3xl font-semibold">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Redeem deals, save favourites and track your savings.</p>
      <div className="glass mt-6 p-4">
        <Button variant="secondary" className="w-full" onClick={google}>Continue with Google</Button>
        <div className="my-4 text-center text-xs text-muted-foreground">or with email</div>
        <form onSubmit={submit} className="grid gap-2">
          {mode === "up" && <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
          <Input type="email" placeholder="Email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input type="password" placeholder="Password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Button type="submit" disabled={busy} className="mt-1">{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
        </form>
      </div>
      <button className="mt-4 w-full text-center text-sm text-muted-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "New here? " : "Already have an account? "}
        <span className="text-primary">{mode === "in" ? "Create an account" : "Sign in"}</span>
      </button>
    </div>
  );
}
