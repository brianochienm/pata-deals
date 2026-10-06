import { supabase } from "@/integrations/supabase/client";

export const PROMO_SELECT =
  "*, businesses(id,name,logo_url,description,phone,email,website,address), categories(id,slug,name,icon), locations(id,area,city)";

export type Promo = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  original_price: number;
  promo_price: number;
  discount_pct: number | null;
  starts_at: string;
  ends_at: string;
  max_redemptions: number | null;
  redemption_method: "coupon" | "qr" | "online" | "booking" | "claim";
  online_url: string | null;
  terms: string | null;
  instructions: string | null;
  tags: string[];
  status: "pending" | "approved" | "rejected";
  is_featured: boolean;
  is_flagged: boolean;
  view_count: number;
  created_at: string;
  business_id: string;
  businesses: {
    id: string;
    name: string;
    logo_url: string | null;
    description: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
  } | null;
  categories: { id: string; slug: string; name: string; icon: string } | null;
  locations: { id: string; area: string; city: string } | null;
};

export async function fetchActivePromos(): Promise<Promo[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("promotions")
    .select(PROMO_SELECT)
    .eq("status", "approved")
    .eq("is_flagged", false)
    .lte("starts_at", now)
    .gt("ends_at", now)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Promo[];
}

export async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchLocations() {
  const { data, error } = await supabase.from("locations").select("*").order("area");
  if (error) throw error;
  return data ?? [];
}

export const activePromosQuery = { queryKey: ["promos", "active"], queryFn: fetchActivePromos };
export const categoriesQuery = { queryKey: ["categories"], queryFn: fetchCategories, staleTime: 600_000 };
export const locationsQuery = { queryKey: ["locations"], queryFn: fetchLocations, staleTime: 600_000 };

export async function uploadImage(userId: string, file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5MB");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (e2 || !data) throw e2 ?? new Error("Upload failed");
  return data.signedUrl;
}
