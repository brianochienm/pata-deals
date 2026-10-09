import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 60000,
    queryFn: async () =>
      (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
  });
  if (!user) return null;
  const unread = data.filter((n) => !n.read).length;
  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  return (
    <DropdownMenu onOpenChange={(o) => { if (!o && unread) markAll(); }}>
      <DropdownMenuTrigger asChild>
        <button aria-label="Notifications" className="relative grid size-9 place-items-center rounded-full bg-glass">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{unread}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-1">
        <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Notifications</p>
        {data.length === 0 && <p className="px-2 py-4 text-center text-sm text-muted-foreground">Follow brands to get alerts when they post deals.</p>}
        <div className="max-h-96 overflow-y-auto">
          {data.map((n) => (
            <Link key={n.id} to={(n.link ?? "/") as "/"} className={`block rounded-md px-2 py-2 hover:bg-glass ${n.read ? "" : "bg-primary/10"}`}>
              <p className="text-sm font-semibold">{n.title}</p>
              {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
              <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
            </Link>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FollowButton({ businessId, name }: { businessId: string; name?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: following } = useQuery({
    queryKey: ["follow", user?.id, businessId],
    enabled: !!user,
    queryFn: async () =>
      !!(await supabase.from("business_follows").select("business_id").eq("business_id", businessId).maybeSingle()).data,
  });
  const toggle = async () => {
    if (!user) { toast("Sign in to follow brands"); return; }
    const { error } = following
      ? await supabase.from("business_follows").delete().eq("user_id", user.id).eq("business_id", businessId)
      : await supabase.from("business_follows").insert({ user_id: user.id, business_id: businessId });
    if (error) return toast.error(error.message);
    toast.success(following ? "Unfollowed" : `You'll be notified when ${name ?? "they"} post new deals`);
    qc.invalidateQueries({ queryKey: ["follow", user.id, businessId] });
  };
  return (
    <Button size="sm" variant={following ? "secondary" : "default"} onClick={toggle} className="ml-auto shrink-0">
      {following ? <><Check className="size-4" />Following</> : <><BellRing className="size-4" />Follow</>}
    </Button>
  );
}
