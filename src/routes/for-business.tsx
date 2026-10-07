import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/for-business")({
  head: () => ({
    meta: [
      { title: "List your promotion free — Duka for Business" },
      { name: "description", content: "Put your offers in front of thousands of Nairobi customers. Free to list, pay only on sales." },
      { property: "og:title", content: "Grow your sales with Duka" },
      { property: "og:description", content: "Free listings. Small commission only on verified redemptions." },
    ],
  }),
  component: ForBusiness,
});

function ForBusiness() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-center">
      <h1 className="text-4xl font-semibold text-balance">Grow Your Sales With Us</h1>
      <p className="mx-auto mt-3 max-w-[48ch] text-muted-foreground">Have an offer? Put it in front of thousands of potential customers. Listing is free — you only pay a small commission when a deal brings you a verified sale.</p>
      <Button asChild size="lg" className="mt-6"><Link to="/business">List Your Promotion — Free</Link></Button>
    </div>
  );
}
