import { Link, useNavigate } from "@tanstack/react-router";
import { Home, Search, Heart, User, Store, Shield, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const BRAND = "Duka";

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
          <div className="grid size-8 place-items-center rounded-[10px] pill-cyan text-sm font-bold">D</div>
          <span className="text-base font-semibold tracking-tight">{BRAND}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link to="/deals" activeProps={{ className: "text-foreground" }}>Explore deals</Link>
          <Link to="/for-business" activeProps={{ className: "text-foreground" }}>For businesses</Link>
          {isBusiness && <Link to="/business" activeProps={{ className: "text-foreground" }}>Dashboard</Link>}
          {isAdmin && <Link to="/admin" activeProps={{ className: "text-foreground" }}>Admin</Link>}
        </nav>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="grid size-9 place-items-center rounded-full bg-glass text-sm font-semibold">
                {(user.email ?? "U")[0].toUpperCase()}
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

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-4 pb-24 pt-8 text-center text-xs text-muted-foreground md:pb-10">
      © {new Date().getFullYear()} {BRAND} · Nairobi, Kenya ·{" "}
      <Link to="/for-business" className="text-primary">List Your Promotion — Free</Link>
    </footer>
  );
}
