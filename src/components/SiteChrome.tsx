import { Link, useNavigate } from "@tanstack/react-router";
import { Home, Search, Heart, User, Store, Shield, LogOut, Mail, Phone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/Notify";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const BRAND = "Pata";

export function SiteHeader() {
  const { user } = useAuth();
  const { isAdmin, isBusiness } = useRoles();
  const nav = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-[10px] pill-cyan text-sm font-bold">P</div>
          <span className="text-base font-semibold tracking-tight">{BRAND}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link to="/deals" activeProps={{ className: "text-foreground" }}>Explore deals</Link>
          <Link to="/finder" activeProps={{ className: "text-foreground" }}>AI Finder</Link>
          <Link to="/for-business" activeProps={{ className: "text-foreground" }}>For businesses</Link>
          {isBusiness && <Link to="/business" activeProps={{ className: "text-foreground" }}>Dashboard</Link>}
          {isAdmin && <Link to="/admin" activeProps={{ className: "text-foreground" }}>Admin</Link>}
        </nav>
        {user && <NotificationBell />}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="grid size-9 place-items-center rounded-full bg-glass text-sm font-semibold">
                {(user.email ?? "U").charAt(0).toUpperCase()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => nav({ to: "/account" })}><User /> My account</DropdownMenuItem>
              <DropdownMenuItem onClick={() => nav({ to: "/business" })}><Store /> {isBusiness ? "Business dashboard" : "List a promotion"}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => nav({ to: "/admin" })}><Shield /> Admin</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}><LogOut /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>
        )}
      </div>
    </header>
  );
}

export function BottomNav() {
  const item = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground";
  const active = { className: "text-primary" };
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border/50 bg-background/90 backdrop-blur md:hidden">
      <Link to="/" className={item} activeProps={active} activeOptions={{ exact: true }}><Home className="size-5" />Home</Link>
      <Link to="/deals" className={item} activeProps={active}><Search className="size-5" />Search</Link>
      <Link to="/account" search={{ tab: "saved" }} className={item} activeProps={active}><Heart className="size-5" />Saved</Link>
      <Link to="/business" className={item} activeProps={active}><Store className="size-5" />Business</Link>
    </nav>
  );
}

export const SUPPORT_EMAIL = "brianochiengodhiambo18@gmail.com";
export const SUPPORT_PHONE = "+254 114 917 724";
export const SUPPORT_PHONE_TEL = "+254114917724";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pb-24 pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:pb-8">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-x-5">
          <span className="font-semibold text-foreground">Support &amp; enquiries</span>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-1.5 hover:text-foreground">
            <Mail className="size-3.5 shrink-0" /> Email: <span className="break-all text-foreground">{SUPPORT_EMAIL}</span>
          </a>
          <a href={`tel:${SUPPORT_PHONE_TEL}`} className="flex items-center gap-1.5 hover:text-foreground">
            <Phone className="size-3.5 shrink-0" /> Tel: <span className="text-foreground">{SUPPORT_PHONE}</span>
          </a>
        </div>
        <p>
          © {new Date().getFullYear()} {BRAND} · Nairobi ·{" "}
          <Link to="/for-business" className="text-primary">List your promotion — free</Link>
        </p>
      </div>
    </footer>
  );
}
