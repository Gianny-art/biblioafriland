import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";
import { NewspaperLogo, badgeFor } from "@/components/NewspaperLogo";
import { MotifBg } from "@/components/Motif";
import { Filter, X } from "lucide-react";
import { analyzePdf } from "@/lib/pdf-analyze";
import { toast } from "sonner";

export const Route = createFileRoute("/journaux")({
  head: () => ({ meta: [{ title: "Bibliothèque — Journaux" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});


function Page() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"archives" | "recent">("recent");
  const [newspaperId, setNewspaperId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [pending, setPending] = useState<{ file: File; newspaperId: string; analysis: any } | null>(null);

  const handleDrop = async (e: React.DragEvent, np: any) => {
    e.preventDefault();
    setDropTarget(null);
    if (role !== "admin") return toast.error("Réservé aux admins");
    const file = e.dataTransfer.files?.[0];
    if (!file || file.type !== "application/pdf") return toast.error("Déposez un PDF");
    toast.message("Analyse du PDF…");
    try {
      const analysis = await analyzePdf(file);
      setPending({ file, newspaperId: np.id, analysis });
    } catch { toast.error("Analyse impossible"); }
  };


  const { data: newspapers = [] } = useQuery({
    queryKey: ["newspapers"],
    queryFn: async () => (await supabase.from("newspapers").select("id,name,slug,frequency,category_id,category:categories(name,slug)").order("name")).data ?? [],
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("id,name,slug")).data ?? [],
  });

  // Charge toutes les parutions, on déduplique côté client par source.
  const { data: allEditions = [] } = useQuery({
    queryKey: ["editions-all", newspaperId, categoryId],
    queryFn: async () => {
      let q = supabase
        .from("editions")
        .select("id, edition_date, title, page_count, cover_url, created_at, newspaper:newspapers!inner(id,name,slug,frequency,category_id,category:categories(name,slug))")
        .order("edition_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (newspaperId) q = q.eq("newspaper_id", newspaperId);
      if (categoryId) q = q.eq("newspaper.category_id", categoryId);
      return (await q).data ?? [];
    },
  });

  // Une carte par source (la plus récente) + héritage de couverture si manquante.
  const { latestPerSource, archives } = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of allEditions as any[]) {
      const k = e.newspaper.id;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    const latest: any[] = [];
    const archs: any[] = [];
    const sevenDaysAgoMs = Date.now() - 7 * 86400000;
    for (const list of map.values()) {
      // déjà trié desc par edition_date puis created_at
      const [top, ...rest] = list;
      // héritage couverture : si la dernière n'a pas de cover, prendre celle d'une plus ancienne
      if (!top.cover_url) {
        const prev = rest.find((r) => r.cover_url);
        if (prev) top.cover_url = prev.cover_url;
      }
      latest.push(top);
      for (const r of rest) {
        const ts = new Date(r.edition_date).getTime();
        if (ts >= sevenDaysAgoMs) archs.push(r);
      }
    }
    latest.sort((a, b) => +new Date(b.edition_date) - +new Date(a.edition_date));
    archs.sort((a, b) => +new Date(b.edition_date) - +new Date(a.edition_date));
    return { latestPerSource: latest, archives: archs };
  }, [allEditions]);

  const editions = tab === "recent" ? latestPerSource : archives;

  return (
    <div className="space-y-6 relative">
      <MotifBg opacity={0.04} />
      <div className="relative">
        <h1 className="text-2xl md:text-3xl font-bold">Bibliothèque</h1>
        <p className="text-sm text-muted-foreground mt-1">Une carte par journal — les anciennes parutions glissent en archives (7 jours).</p>
      </div>

      <div className="relative flex gap-6 border-b border-border">
        {[
          { k: "recent", label: "Parutions récentes" },
          { k: "archives", label: "Archives (7 jours)" },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px ${tab === t.k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative flex flex-wrap gap-3 items-center">
        <select value={newspaperId} onChange={(e) => setNewspaperId(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-card text-sm">
          <option value="">Tous les journaux</option>
          {newspapers.map((n: any) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-card text-sm">
          <option value="">Toutes les catégories</option>
          {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="h-9 px-3 rounded-md border border-border bg-card text-sm flex items-center gap-2 text-muted-foreground">
          <Filter className="h-4 w-4" /> {editions.length} résultat(s)
        </span>
      </div>

      <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {editions.map((e: any) => (
          <div key={e.id}
            onDragOver={(ev) => { if (role === "admin") { ev.preventDefault(); setDropTarget(e.newspaper.id); } }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(ev) => handleDrop(ev, e.newspaper)}
            className={`relative ${dropTarget === e.newspaper.id ? "ring-2 ring-primary rounded-lg" : ""}`}>
            <Link to="/lecteur/$editionId" params={{ editionId: e.id }} className="group block">
              <NewspaperLogo slug={e.newspaper.slug} name={e.newspaper.name} coverUrl={e.cover_url} badge={tab === "archives" ? "old" : badgeFor(e.edition_date)} className="aspect-[3/4] mb-2 group-hover:shadow-elegant transition" />
              <p className="font-medium text-sm truncate">{e.newspaper.name}</p>
              <p className="text-xs text-muted-foreground">{new Date(e.edition_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</p>
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground inline-block mt-1">{e.newspaper.category?.name ?? "Général"}</span>
            </Link>
            {role === "admin" && dropTarget === e.newspaper.id && (
              <div className="absolute inset-0 bg-primary/15 grid place-items-center text-xs font-bold text-primary pointer-events-none rounded-lg">Déposer le PDF ici</div>
            )}
          </div>
        ))}
        {editions.length === 0 && <p className="text-muted-foreground text-sm col-span-full text-center py-12">
          {tab === "recent" ? "Aucune parution disponible." : "Aucune archive sur les 7 derniers jours."}
        </p>}
      </div>

      {pending && (
        <DropDialog item={pending} onClose={() => setPending(null)} onSaved={() => { setPending(null); qc.invalidateQueries({ queryKey: ["editions-all"] }); }} />
      )}
    </div>
  );
}

function DropDialog({ item, onClose, onSaved }: { item: { file: File; newspaperId: string; analysis: any }; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState<string>(item.analysis.title || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [pages, setPages] = useState(item.analysis.pageCount || 12);
  const [saving, setSaving] = useState(false);
  const auto = !!item.analysis.title && item.analysis.pageCount > 0;

  const save = async () => {
    setSaving(true);
    const path = `editions/${item.newspaperId}/${date}-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage.from("newspaper-pdfs").upload(path, item.file);
    if (upErr) { setSaving(false); return toast.error(upErr.message); }
    const pdf_url = supabase.storage.from("newspaper-pdfs").getPublicUrl(path).data.publicUrl;

    // Héritage : couverture de la dernière parution de la même source
    let cover_url: string | null = null;
    const { data: prev } = await supabase
      .from("editions")
      .select("cover_url")
      .eq("newspaper_id", item.newspaperId)
      .not("cover_url", "is", null)
      .order("edition_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prev?.cover_url) cover_url = prev.cover_url;

    // Sinon, génération auto depuis la page 1 du PDF
    if (!cover_url) {
      try {
        const { renderPdfPageToBlob } = await import("@/components/PdfPage");
        const blob = await renderPdfPageToBlob(item.file, 1, 1.5);
        const cpath = `covers/${item.newspaperId}/${date}-${Date.now()}-auto.jpg`;
        const { error: cErr } = await supabase.storage.from("newspaper-pdfs").upload(cpath, blob, { contentType: "image/jpeg" });
        if (!cErr) cover_url = supabase.storage.from("newspaper-pdfs").getPublicUrl(cpath).data.publicUrl;
      } catch { /* ignore */ }
    }

    const { data: ed, error } = await supabase.from("editions").insert({
      newspaper_id: item.newspaperId, edition_date: date, title: title || null,
      page_count: pages, pdf_url, cover_url,
    }).select().single();
    if (error) { setSaving(false); return toast.error(error.message); }
    if (ed) {
      const rows = Array.from({ length: pages }, (_, i) => ({ edition_id: ed.id, page_number: i + 1, image_url: `${pdf_url}#page=${i + 1}` }));
      await supabase.from("edition_pages").insert(rows);
    }
    setSaving(false);
    toast.success("Parution ajoutée — utilisateurs notifiés");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border max-w-md w-full p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-bold text-lg">Nouvelle parution</h2><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <p className="text-xs text-muted-foreground">
          {auto ? "✓ Analyse PDF réussie — vérifiez et confirmez." : "⚠️ Analyse incomplète — saisissez les informations manuellement."}
        </p>
        <label className="block text-xs"><span className="text-muted-foreground">Titre</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-background text-sm" /></label>
        <label className="block text-xs"><span className="text-muted-foreground">Date de parution</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-background text-sm" /></label>
        <label className="block text-xs"><span className="text-muted-foreground">Pages détectées</span>
          <input type="number" value={pages} onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))} className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-background text-sm" /></label>
        <button disabled={saving} onClick={save} className="w-full h-11 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60">
          {saving ? "Publication…" : "Publier la parution"}
        </button>
      </div>
    </div>
  );
}
