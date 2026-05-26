import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Scale, ExternalLink, FileText, X, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";
import { MotifBg } from "@/components/Motif";

export const Route = createFileRoute("/reglementations")({
  head: () => ({ meta: [{ title: "Règlementations — COBAC, CEMAC, BEAC" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});

const SOURCES = ["Toutes", "COBAC", "CEMAC", "BEAC", "Autre"] as const;

function Page() {
  const { role } = useAuth();
  const [source, setSource] = useState<(typeof SOURCES)[number]>("Toutes");
  const [openItem, setOpenItem] = useState<any>(null);

  const { data: regs = [] } = useQuery({
    queryKey: ["regulations", source],
    queryFn: async () => {
      let q = supabase.from("regulations").select("*").order("published_at", { ascending: false });
      if (source !== "Toutes") q = q.eq("source", source);
      return (await q).data ?? [];
    },
  });

  const { data: sources = [] } = useQuery({
    queryKey: ["regulation-sources"],
    enabled: role === "admin",
    queryFn: async () => (await supabase.from("regulation_sources").select("*").order("name")).data ?? [],
  });

  return (
    <div className="space-y-6 relative">
      <MotifBg opacity={0.05} />
      <div className="relative">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Scale className="h-7 w-7 text-primary" /> Règlementations</h1>
        <p className="text-sm text-muted-foreground mt-1">COBAC · CEMAC · BEAC — Réformes en vigueur, mises à jour automatiquement depuis les sources officielles.</p>
      </div>

      {role === "admin" && sources.length > 0 && (
        <div className="relative bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Globe className="h-4 w-4 text-primary" /> Sources officielles surveillées</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {sources.map((s: any) => (
              <a key={s.id} href={s.url} target="_blank" rel="noreferrer"
                className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-accent transition text-sm">
                <ExternalLink className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.url}</p>
                </div>
              </a>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Les règlementations sont récupérées automatiquement depuis ces sources. Les utilisateurs sont notifiés à chaque ajout.</p>
        </div>
      )}

      <div className="relative flex gap-2 overflow-x-auto pb-1">
        {SOURCES.map((s) => (
          <button key={s} onClick={() => setSource(s)}
            className={`h-9 px-4 rounded-full text-xs font-semibold whitespace-nowrap border ${source === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="relative grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {regs.map((r: any) => (
          <button key={r.id} onClick={() => setOpenItem(r)}
            className="group text-left bg-card border border-border rounded-xl overflow-hidden hover:shadow-elegant transition">
            <div className="relative h-40 overflow-hidden">
              <img src={r.image_url || "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=1200&q=80"}
                alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary text-primary-foreground">{r.source}</span>
            </div>
            <div className="p-5">
              <p className="text-xs text-muted-foreground mb-1">{new Date(r.published_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
              <h3 className="font-semibold group-hover:text-primary transition">{r.title}</h3>
              {r.summary && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{r.summary}</p>}
            </div>
          </button>
        ))}
        {regs.length === 0 && <p className="text-muted-foreground text-sm col-span-full text-center py-12">Aucune règlementation.</p>}
      </div>

      {openItem && <Detail item={openItem} onClose={() => setOpenItem(null)} />}
    </div>
  );
}

function Detail({ item, onClose }: { item: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border max-w-3xl w-full max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {item.image_url && <img src={item.image_url} alt="" className="w-full h-48 object-cover" />}
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">{item.source}</span>
              <h2 className="text-xl font-bold mt-2">{item.title}</h2>
              <p className="text-xs text-muted-foreground mt-1">Publiée le {new Date(item.published_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-accent rounded"><X className="h-5 w-5" /></button>
          </div>
          {item.summary && <p className="text-sm text-muted-foreground mb-4 italic">{item.summary}</p>}
          {item.content && <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">{item.content}</div>}
          <div className="flex flex-wrap gap-2 mt-6">
            {item.pdf_url && <a href={item.pdf_url} target="_blank" rel="noreferrer" className="h-9 px-3 rounded-md border border-border text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Voir le PDF</a>}
            {item.external_url && <a href={item.external_url} target="_blank" rel="noreferrer" className="h-9 px-3 rounded-md border border-border text-sm flex items-center gap-2"><ExternalLink className="h-4 w-4" /> Source officielle</a>}
          </div>
        </div>
      </div>
    </div>
  );
}
