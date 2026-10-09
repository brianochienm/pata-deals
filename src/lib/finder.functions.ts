import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type FinderMatch = { id: string; reason: string };
export type FinderResult = { summary: string; matches: FinderMatch[]; error?: string };

export const findDeals = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ query: z.string().trim().min(3).max(500) }).parse(d))
  .handler(async ({ data }): Promise<FinderResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { summary: "", matches: [], error: "The deal finder isn't configured yet." };

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const now = new Date().toISOString();
    const { data: promos, error } = await sb
      .from("promotions")
      .select("id,title,description,promo_price,original_price,discount_pct,ends_at,redemption_method,tags,businesses(name),categories(name),locations(area)")
      .eq("status", "approved")
      .eq("is_flagged", false)
      .lte("starts_at", now)
      .gt("ends_at", now)
      .limit(150);
    if (error) return { summary: "", matches: [], error: "Couldn't load deals right now." };
    if (!promos?.length) return { summary: "There are no live deals on Pata right now.", matches: [] };

    const catalog = promos.map((p: any) => ({
      id: p.id,
      title: p.title,
      business: p.businesses?.name,
      category: p.categories?.name,
      area: p.locations?.area,
      price_ksh: p.promo_price,
      was_ksh: p.original_price,
      discount_pct: p.discount_pct,
      ends: p.ends_at?.slice(0, 10),
      method: p.redemption_method,
      tags: p.tags,
      about: (p.description ?? "").slice(0, 200),
    }));
    const validIds = new Set(catalog.map((c) => c.id));

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const { createLovableAiGatewayRunIdFetch } = await import("./ai-gateway.server");
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        instructions:
          "You are Pata's deal finder for Nairobi, Kenya. Prices are in KSh. Pick up to 6 offers from the provided catalog that best match the shopper's request (budget, area, category, occasion). Only use ids from the catalog; never invent offers. Reply with JSON only, shaped {\"summary\": string (1-2 friendly sentences), \"matches\": [{\"id\": string, \"reason\": string (one short sentence why it fits)}]}. If nothing fits, return an empty matches array and suggest what to try in the summary.",
        messages: [
          { role: "user", content: `Shopper request: ${data.query}\n\nCatalog (json):\n${JSON.stringify(catalog)}` },
        ],
        maxRetries: 0,
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      } as any);
      const text = await result.text;
      const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      const matches: FinderMatch[] = (Array.isArray(json.matches) ? json.matches : [])
        .filter((m: any) => m && validIds.has(m.id))
        .slice(0, 6)
        .map((m: any) => ({ id: m.id, reason: String(m.reason ?? "").slice(0, 300) }));
      return { summary: String(json.summary ?? ""), matches };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status ?? e?.lastError?.statusCode;
      console.error("finder error", status, e?.message);
      if (status === 429) return { summary: "", matches: [], error: "Lots of people are searching — try again in a moment." };
      if (status === 402) return { summary: "", matches: [], error: "AI credits have run out. Please add credits to keep the finder running." };
      if (status === 403) return { summary: "", matches: [], error: "The AI finder isn't available right now." };
      return { summary: "", matches: [], error: "Something went wrong finding deals. Please try again." };
    }
  });
