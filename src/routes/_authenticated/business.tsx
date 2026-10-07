import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/business")({
  head: () => ({ meta: [{ title: "Business dashboard — Pata" }, { name: "description", content: "Manage your promotions and redemptions." }] }),
  component: () => (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Business dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">Business sign-up, promotion creation and code verification are coming next.</p>
    </div>
  ),
});
