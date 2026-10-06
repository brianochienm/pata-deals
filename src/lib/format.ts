export const ksh = (n: number | null | undefined) =>
  `KSh ${Math.round(Number(n ?? 0)).toLocaleString("en-KE")}`;

export function endsIn(ends: string) {
  const ms = new Date(ends).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `Ends in ${Math.max(1, Math.floor(ms / 60000))} min`;
  if (h < 24) return `Ends in ${h} hr${h === 1 ? "" : "s"}`;
  const d = Math.floor(h / 24);
  return `Ends in ${d} day${d === 1 ? "" : "s"}`;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export const methodLabel: Record<string, string> = {
  coupon: "Coupon code",
  qr: "QR code in-store",
  online: "Online purchase",
  booking: "Booking",
  claim: "Claim & visit",
};

export const tones = ["pill-coral", "pill-cyan", "pill-gold"] as const;
export const toneFor = (s: string) => tones[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 3];
