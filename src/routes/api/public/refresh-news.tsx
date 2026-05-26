import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Sources RSS d'actualités financières / économiques pertinentes
const FEEDS = [
  { source: "Reuters Africa", url: "https://www.google.com/alerts/feeds/04706395822614108476/3055090604608547213" },
  { source: "BFM Business", url: "https://www.bfmtv.com/rss/economie/" },
  { source: "Les Échos", url: "https://syndication.lesechos.fr/rss/rss_finance-marches.xml" },
  { source: "Jeune Afrique", url: "https://www.jeuneafrique.com/economie/feed/" },
  { source: "Agence Ecofin", url: "https://www.agenceecofin.com/rss" },
  { source: "Cameroon Tribune", url: "https://www.cameroon-tribune.cm/feed" },
  { source: "Investir au Cameroun", url: "https://www.investiraucameroun.com/rss" },
];

function parseRss(xml: string, source: string) {
  const items: { title: string; url: string; source: string; published_at: string; summary: string | null }[] = [];
  const itemRe = /<item[\s\S]*?<\/item>/g;
  const m = xml.match(itemRe) ?? [];
  for (const block of m.slice(0, 8)) {
    const title = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim();
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();
    const date = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
    const desc = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]?.trim();
    if (title && link) {
      items.push({
        title: title.replace(/<[^>]+>/g, "").slice(0, 280),
        url: link,
        source,
        published_at: date ? new Date(date).toISOString() : new Date().toISOString(),
        summary: desc ? desc.replace(/<[^>]+>/g, "").slice(0, 400) : null,
      });
    }
  }
  return items;
}

async function refresh() {
  let inserted = 0;
  const all: any[] = [];
  await Promise.allSettled(FEEDS.map(async (f) => {
    try {
      const r = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0 AfrilandBot/1.0" } });
      if (!r.ok) return;
      const xml = await r.text();
      all.push(...parseRss(xml, f.source));
    } catch {}
  }));
  if (all.length > 0) {
    const { error, count } = await supabaseAdmin.from("news_feed").upsert(all, { onConflict: "url", count: "exact", ignoreDuplicates: true });
    if (!error) inserted = count ?? all.length;
  }
  // Purge old entries (>30 days)
  await supabaseAdmin.from("news_feed").delete().lt("published_at", new Date(Date.now() - 30 * 86400000).toISOString());
  return { fetched: all.length, inserted, feeds: FEEDS.length };
}

export const Route = createFileRoute("/api/public/refresh-news")({
  server: {
    handlers: {
      GET: async () => {
        const result = await refresh();
        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
      },
      POST: async () => {
        const result = await refresh();
        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
