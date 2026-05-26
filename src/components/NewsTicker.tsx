import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Radio } from "lucide-react";

export default function NewsTicker() {
  const { data: items = [] } = useQuery({
    queryKey: ["news-feed"],
    queryFn: async () =>
      (await supabase.from("news_feed").select("id,title,source,url,published_at").order("published_at", { ascending: false }).limit(30)).data ?? [],
    refetchInterval: 60_000,
  });

  if (items.length === 0) return null;
  const loop = [...items, ...items];

  return (
    <section className="relative -mx-6 lg:-mx-10 mt-12 border-y border-border bg-gradient-to-r from-primary/5 via-background to-primary/5 overflow-hidden">
      <div className="flex items-center">
        <div className="shrink-0 bg-primary text-primary-foreground px-5 py-3 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 animate-pulse" /> En direct
        </div>
        <div className="relative flex-1 overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)" }}>
          <div className="flex gap-8 py-3 ticker-track whitespace-nowrap">
            {loop.map((n: any, i: number) => (
              <a
                key={`${n.id}-${i}`}
                href={n.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-3 text-sm hover:text-primary transition shrink-0"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-1.5 py-0.5 border border-primary/30 rounded">
                  {n.source}
                </span>
                <span className="font-medium">{n.title}</span>
                <ExternalLink className="h-3 w-3 opacity-50" />
                <span className="text-muted-foreground/40">·</span>
              </a>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes news-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ticker-track { animation: news-scroll 90s linear infinite; }
        .ticker-track:hover { animation-play-state: paused; }
      `}</style>
    </section>
  );
}
