import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"archives" | "recent" | "downloads">("recent");
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

  const { data: editions = [] } = useQuery({
    queryKey: ["editions", tab, newspaperId, categoryId, user?.id],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

      if (tab === "downloads") {
        if (!user) return [];
        const { data: dl } = await supabase.from("downloads")
          .select("downloaded_at, edition:editions(id, edition_date, title, page_count, cover_url, newspaper:newspapers!inner(id,name,slug,frequency,category_id,category:categories(name,slug)))")
          .eq("user_id", user.id).order("downloaded_at", { ascending: false }).limit(80);
        let rows = (dl ?? []).map((d: any) => d.edition).filter(Boolean);
        if (newspaperId) rows = rows.filter((e: any) => e.newspaper.id === newspaperId);
        if (categoryId) rows = rows.filter((e: any) => e.newspaper.category_id === categoryId);
        return rows;
      }

      let q = supabase.from("editions").select("id, edition_date, title, page_count, cover_url, newspaper:newspapers!inner(id,name,slug,frequency,category_id,category:categories(name,slug))");
      if (tab === "recent") q = q.gte("edition_date", sevenDaysAgo).order("edition_date", { ascending: false });
      else q = q.lt("edition_date", sevenDaysAgo).order("edition_date", { ascending: false });
      q = q.limit(80);
      if (newspaperId) q = q.eq("newspaper_id", newspaperId);
      if (categoryId) q = q.eq("newspaper.category_id", categoryId);
      return (await q).data ?? [];
    },
  });

  return (
    <div className="space-y-6 relative">
      <MotifBg opacity={0.04} />
      <div className="relative">
        <h1 className="text-2xl md:text-3xl font-bold">Bibliothèque</h1>
        <p className="text-sm text-muted-foreground mt-1">Toutes les parutions, classées par fraîcheur.</p>
      </div>

      <div className="relative flex gap-6 border-b border-border">
        {[
          { k: "recent", label: "Parutions récentes" },
          { k: "archives", label: "Archives" },
          { k: "downloads", label: "Mes téléchargements" },
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
          {tab === "downloads" ? "Vous n'avez encore téléchargé aucun journal." : tab === "recent" ? "Aucune parution récente (moins de 7 jours)." : "Aucune archive."}
        </p>}
      </div>

      {pending && (
        <DropDialog item={pending} onClose={() => setPending(null)} onSaved={() => { setPending(null); qc.invalidateQueries({ queryKey: ["editions"] }); }} />
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
    const { data: ed, error } = await supabase.from("editions").insert({
      newspaper_id: item.newspaperId, edition_date: date, title: title || null,
      page_count: pages, pdf_url,
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

