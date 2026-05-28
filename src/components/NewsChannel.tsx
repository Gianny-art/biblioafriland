import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Radio, ExternalLink } from "lucide-react";

type Item = {
  id: string;
  title: string;
  source: string;
  url: string;
  image_url: string | null;
  summary: string | null;
  published_at: string;
};

// Palette de dégradés "journaux finance" cohérente avec le thème
const GRADIENTS = [
  "from-primary/80 via-primary/40 to-background",
  "from-amber-700/80 via-amber-500/30 to-background",
  "from-emerald-800/80 via-emerald-600/30 to-background",
  "from-slate-900/80 via-slate-700/30 to-background",
  "from-rose-800/80 via-rose-500/30 to-background",
  "from-indigo-800/80 via-indigo-500/30 to-background",
];

export default function NewsChannel() {
  const { data: items = [] } = useQuery({
    queryKey: ["news-channel"],
    queryFn: async () =>
      ((await supabase
        .from("news_feed")
        .select("id,title,source,url,image_url,summary,published_at")
        .order("published_at", { ascending: false })
        .limit(20)).data ?? []) as Item[],
    refetchInterval: 120_000,
  });

  if (items.length === 0) return null;
  const loop = [...items, ...items];

  return (
    <section className="relative -mx-6 lg:-mx-10 overflow-hidden">
      <div className="px-6 lg:px-10 mb-3 flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary animate-pulse" />
          Canal finance — en continu
        </h2>
        <span className="text-xs text-muted-foreground">Mis à jour automatiquement</span>
      </div>
      <div
        className="relative w-screen left-1/2 -translate-x-1/2 overflow-hidden py-2"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 3%, black 97%, transparent)",
        }}
      >
        <div className="flex gap-5 channel-track">
          {loop.map((n, i) => {
            const grad = GRADIENTS[i % GRADIENTS.length];
            return (
              <a
                key={`${n.id}-${i}`}
                href={n.url}
                target="_blank"
                rel="noreferrer noopener"
                className="group relative shrink-0 w-[280px] h-[360px] rounded-2xl overflow-hidden border border-white/20 backdrop-blur-md bg-card/40 shadow-card hover:shadow-elegant transition-all hover:-translate-y-1"
                style={{
                  boxShadow:
                    "0 1px 0 0 rgba(255,255,255,0.15) inset, 0 8px 32px -8px rgba(0,0,0,0.25)",
                }}
              >
                {n.image_url ? (
                  <img
                    src={n.image_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
                )}
                <div className={`absolute inset-0 bg-gradient-to-t ${grad} mix-blend-multiply opacity-90`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white px-2 py-1 rounded-md bg-white/15 backdrop-blur-md border border-white/30">
                    {n.source}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-white/80" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="font-bold text-sm leading-snug line-clamp-3 drop-shadow">
                    {n.title}
                  </p>
                  {n.summary && (
                    <p className="text-xs text-white/85 mt-2 line-clamp-3 leading-relaxed">
                      {n.summary}
                    </p>
                  )}
                  <p className="text-[10px] text-white/70 mt-2 uppercase tracking-wide">
                    {new Date(n.published_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes channel-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .channel-track { animation: channel-scroll 120s linear infinite; width: max-content; }
        .channel-track:hover { animation-play-state: paused; }
      `}</style>
    </section>
  );
}
