import chicken from "@/assets/deal-chicken.jpg";
import pastry from "@/assets/deal-pastry.jpg";
import gym from "@/assets/deal-gym.jpg";
import spa from "@/assets/deal-spa.jpg";
import sneakers from "@/assets/deal-sneakers.jpg";
import hotel from "@/assets/deal-hotel.jpg";
import earbuds from "@/assets/deal-earbuds.jpg";
import cinema from "@/assets/deal-cinema.jpg";

const seed: Record<string, string> = { chicken, pastry, gym, spa, sneakers, hotel, earbuds, cinema };

export function promoImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("seed:")) return seed[url.slice(5)] ?? null;
  return url;
}
