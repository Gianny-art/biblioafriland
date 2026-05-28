import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, Newspaper, Users, Plus, X, Upload, ShieldCheck, ShieldOff, TrendingUp, Edit3, Trash2, Globe, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";
import { MotifBg } from "@/components/Motif";
import { toast } from "sonner";

export const Route = createFileRoute("/administration")({
  head: () => ({ meta: [{ title: "Administration — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});

type Tab = "dashboard" | "analytics" | "editions" | "users" | "sources";

function Page() {
  const { role } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");

  if (role !== "admin") {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-bold">Accès restreint</h1>
        <p className="text-muted-foreground text-sm mt-2">Cette section est réservée aux administrateurs.</p>
        <Link to="/" className="inline-block mt-4 text-primary text-sm">Retour à l'accueil</Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[240px_1fr] gap-6 relative">
      <MotifBg opacity={0.04} />
      <aside className="relative bg-card border border-border rounded-xl p-3 h-fit">
        {[
          { k: "dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
          { k: "analytics", icon: TrendingUp, label: "Centre d'analyse" },
          { k: "editions", icon: Newspaper, label: "Parutions" },
          { k: "users", icon: Users, label: "Utilisateurs & rôles" },
          { k: "sources", icon: Globe, label: "Sources règlementations" },
        ].map((it) => (
          <button key={it.k} onClick={() => setTab(it.k as Tab)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${tab === it.k ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
            <it.icon className="h-4 w-4" /> {it.label}
          </button>
        ))}
      </aside>

      <div className="relative space-y-6">
        {tab === "dashboard" && <Dashboard />}
        {tab === "analytics" && <Analytics />}
        {tab === "editions" && <EditionsAdmin />}
        {tab === "users" && <UsersAdmin />}
        {tab === "sources" && <SourcesAdmin />}
      </div>
    </div>
  );
}

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [n, c, e, a, u, r] = await Promise.all([
        supabase.from("newspapers").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("editions").select("id", { count: "exact", head: true }),
        supabase.from("articles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("regulations").select("id", { count: "exact", head: true }),
      ]);
      return { newspapers: n.count ?? 0, categories: c.count ?? 0, editions: e.count ?? 0, articles: a.count ?? 0, users: u.count ?? 0, regulations: r.count ?? 0 };
    },
  });
  return (
    <>
      <h1 className="text-2xl md:text-3xl font-bold">Tableau de bord</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KPI label="Utilisateurs" value={stats?.users ?? 0} />
        <KPI label="Journaux" value={stats?.newspapers ?? 0} />
        <KPI label="Parutions" value={stats?.editions ?? 0} />
        <KPI label="Catégories" value={stats?.categories ?? 0} />
        <KPI label="Articles indexés" value={stats?.articles ?? 0} />
        <KPI label="Règlementations" value={stats?.regulations ?? 0} />
      </div>
    </>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
    </div>
  );
}

// === ANALYTICS ===
const DIGITAL_PRICE = 150;
const PAPER_PRICE = 400;
const PAPER_PER_DAY = 40;

function Analytics() {
  const { data } = useQuery({
    queryKey: ["analytics-data"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [users, reads, downloads] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("downloads").select("id", { count: "exact", head: true }).gte("downloaded_at", since),
        supabase.from("downloads").select("downloaded_at").gte("downloaded_at", since).order("downloaded_at"),
      ]);
      const map = new Map<string, number>();
      (downloads.data ?? []).forEach((d: any) => {
        const k = d.downloaded_at.slice(0, 10);
        map.set(k, (map.get(k) ?? 0) + 1);
      });
      const days: { day: string; reads: number; revenue: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        const r = map.get(d) ?? 0;
        const revenue = r * DIGITAL_PRICE + PAPER_PER_DAY * PAPER_PRICE;
        days.push({ day: d, reads: r, revenue });
      }
      const totalRevenue = days.reduce((s, d) => s + d.revenue, 0);
      return { users: users.count ?? 0, totalReads: reads.count ?? 0, days, totalRevenue };
    },
  });

  if (!data) return <p className="text-muted-foreground">Chargement…</p>;
  const maxRevenue = Math.max(...data.days.map((d) => d.revenue), 1);
  const w = 800, h = 240, pad = 36;
  const points = data.days.map((d, i) => {
    const x = pad + (i * (w - 2 * pad)) / Math.max(1, data.days.length - 1);
    const y = h - pad - (d.revenue / maxRevenue) * (h - 2 * pad);
    return { x, y, ...d };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${h - pad} L${points[0].x},${h - pad} Z`;

  return (
    <>
      <h1 className="text-2xl md:text-3xl font-bold">Centre d'analyse</h1>
      <p className="text-sm text-muted-foreground">30 derniers jours · Prix numérique {DIGITAL_PRICE} FCFA · Prix papier {PAPER_PRICE} FCFA · {PAPER_PER_DAY} exemplaires papier/jour</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPI label="Utilisateurs inscrits" value={data.users} />
        <KPI label="Articles lus (30j)" value={data.totalReads} />
        <BigKPI label="Revenu cumulé" value={`${data.totalRevenue.toLocaleString("fr-FR")} F`} />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Évolution du revenu (30 jours)</h2>
          <span className="text-xs flex items-center gap-1.5 text-muted-foreground">
            <span className="w-3 h-0.5 inline-block" style={{ background: "var(--primary)" }} /> Revenus FCFA
          </span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
          <defs>
            <linearGradient id="rev-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = h - pad - t * (h - 2 * pad);
            return (
              <g key={t}>
                <line x1={pad} x2={w - pad} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
                <text x={pad - 6} y={y + 3} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">
                  {Math.round(maxRevenue * t).toLocaleString("fr-FR")}
                </text>
              </g>
            );
          })}
          <path d={areaPath} fill="url(#rev-grad)" />
          <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => i % 3 === 0 && (
            <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="var(--primary)" />
          ))}
          {points.map((p, i) => i % 5 === 0 && (
            <text key={`l-${i}`} x={p.x} y={h - 10} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
              {p.day.slice(5)}
            </text>
          ))}
        </svg>
      </div>
    </>
  );
}

function BigKPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 border-l-4 border-l-primary">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
    </div>
  );
}


// === EDITIONS ===
function EditionsAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { data: editions = [] } = useQuery({
    queryKey: ["admin-editions"],
    queryFn: async () => (await supabase.from("editions").select("id, edition_date, title, page_count, pdf_url, cover_url, newspaper:newspapers(id,name,slug)").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  const del = async (id: string) => {
    if (!confirm("Supprimer cette parution ?")) return;
    await supabase.from("edition_pages").delete().eq("edition_id", id);
    const { error } = await supabase.from("editions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Parution supprimée"); qc.invalidateQueries({ queryKey: ["admin-editions"] }); }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Parutions</h1>
        <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" /> Charger une parution
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="text-left p-3">Journal</th><th className="text-left p-3">Édition</th><th className="text-left p-3">Pages</th><th className="text-left p-3">Statut</th><th className="text-right p-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {editions.map((e: any) => (
              <tr key={e.id}>
                <td className="p-3 font-medium">{e.newspaper?.name}</td>
                <td className="p-3">{new Date(e.edition_date).toLocaleDateString("fr-FR")}</td>
                <td className="p-3">{e.page_count}</td>
                <td className="p-3 text-xs">
                  {e.pdf_url ? <span className="px-2 py-0.5 rounded bg-success/10 text-success">PDF prêt</span> : <span className="px-2 py-0.5 rounded bg-warning/10 text-warning">Sans PDF</span>}
                </td>
                <td className="p-3 text-right space-x-1">
                  <button onClick={() => setEditing(e)} className="p-1.5 rounded hover:bg-accent inline-grid place-items-center"><Edit3 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => del(e.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive inline-grid place-items-center"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
            {editions.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucune parution.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && <EditionDialog onClose={() => setOpen(false)} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admin-editions"] }); }} />}
      {editing && <EditionDialog edition={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-editions"] }); }} />}
    </>
  );
}

function EditionDialog({ edition, onClose, onSaved }: { edition?: any; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!edition;
  const { data: newspapers = [] } = useQuery({
    queryKey: ["admin-newspapers-select"],
    queryFn: async () => (await supabase.from("newspapers").select("id,name").order("name")).data ?? [],
  });
  const [form, setForm] = useState({
    newspaper_id: edition?.newspaper?.id ?? "",
    edition_date: edition?.edition_date ?? new Date().toISOString().slice(0, 10),
    title: edition?.title ?? "",
    summary: edition?.summary ?? "",
    page_count: edition?.page_count ?? 1,
  });
  const [pdf, setPdf] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleFile = async (file: File) => {
    setPdf(file);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isWord = /\.(docx?|odt)$/i.test(file.name) || file.type.includes("word") || file.type.includes("opendocument");
    if (!isPdf && !isWord) return toast.error("Format non supporté (PDF ou Word uniquement)");

    setAnalyzing(true);
    try {
      if (isPdf) {
        const { analyzePdf } = await import("@/lib/pdf-analyze");
        const a = await analyzePdf(file);
        setForm((f) => ({
          ...f,
          page_count: a.pageCount || f.page_count,
          title: f.title || a.title || "",
        }));
        toast.success(`PDF analysé : ${a.pageCount} page(s)`);
      } else {
        // Estimation Word: ~3000 caractères/page après lecture brute (sans dépendance lourde)
        const text = await file.text().catch(() => "");
        const est = Math.max(1, Math.ceil(text.length / 3000));
        setForm((f) => ({ ...f, page_count: est }));
        if (text.trim().length > 50) setExtractedText(text.slice(0, 2000));
        toast.success(`Document Word — ~${est} page(s) estimées`);
      }
    } catch (e: any) {
      toast.error("Analyse impossible : " + (e?.message ?? "erreur"));
    } finally {
      setAnalyzing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const save = async () => {
    if (!form.newspaper_id) return toast.error("Sélectionnez un journal");
    setSaving(true);
    let pdf_url: string | null = edition?.pdf_url ?? null;
    let cover_url: string | null = edition?.cover_url ?? null;
    if (pdf) {
      const ext = pdf.name.split(".").pop() || "pdf";
      const path = `editions/${form.newspaper_id}/${form.edition_date}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("newspaper-pdfs").upload(path, pdf);
      if (error) { setSaving(false); return toast.error("Upload : " + error.message); }
      pdf_url = supabase.storage.from("newspaper-pdfs").getPublicUrl(path).data.publicUrl;
    }
    if (cover) {
      const path = `covers/${form.newspaper_id}/${form.edition_date}-${Date.now()}.${cover.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("newspaper-pdfs").upload(path, cover);
      if (error) { setSaving(false); return toast.error("Couverture : " + error.message); }
      cover_url = supabase.storage.from("newspaper-pdfs").getPublicUrl(path).data.publicUrl;
    } else if (!cover_url && pdf && /\.pdf$/i.test(pdf.name)) {
      // Auto-génération de la couverture depuis la page 1 du PDF
      try {
        const { renderPdfPageToBlob } = await import("@/components/PdfPage");
        const blob = await renderPdfPageToBlob(pdf, 1, 1.5);
        const path = `covers/${form.newspaper_id}/${form.edition_date}-${Date.now()}-auto.jpg`;
        const { error } = await supabase.storage.from("newspaper-pdfs").upload(path, blob, { contentType: "image/jpeg" });
        if (!error) cover_url = supabase.storage.from("newspaper-pdfs").getPublicUrl(path).data.publicUrl;
      } catch (e) { /* ignore */ }
    }
    // Si pas de couverture définie, on hérite de la dernière parution de la même source
    if (!cover_url) {
      const { data: prev } = await supabase
        .from("editions")
        .select("cover_url")
        .eq("newspaper_id", form.newspaper_id)
        .not("cover_url", "is", null)
        .order("edition_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prev?.cover_url) cover_url = prev.cover_url;
    }

    const summaryValue = form.summary || (extractedText ? extractedText.slice(0, 500) : null);

    if (isEdit) {
      const { error } = await supabase.from("editions").update({
        newspaper_id: form.newspaper_id, edition_date: form.edition_date,
        title: form.title || null, summary: summaryValue,
        page_count: form.page_count, pdf_url, cover_url,
      }).eq("id", edition.id);
      setSaving(false);
      if (error) return toast.error("Enregistrement : " + error.message);
      toast.success("Parution mise à jour");
    } else {
      const { data: ed, error } = await supabase.from("editions").insert({
        newspaper_id: form.newspaper_id, edition_date: form.edition_date,
        title: form.title || null, summary: summaryValue,
        page_count: form.page_count, pdf_url, cover_url,
      }).select().single();
      if (error) { setSaving(false); return toast.error("Publication : " + error.message); }
      if (ed) {
        const pageRows = Array.from({ length: form.page_count }, (_, i) => ({
          edition_id: ed.id, page_number: i + 1, image_url: pdf_url ? `${pdf_url}#page=${i + 1}` : null,
        }));
        await supabase.from("edition_pages").insert(pageRows);
      }
      setSaving(false);
      toast.success("Parution publiée — utilisateurs notifiés");
    }
    onSaved();
  };

  const showSummary = !!form.summary || !!extractedText;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-bold text-lg">{isEdit ? "Modifier la parution" : "Charger une parution"}</h2><button onClick={onClose}><X className="h-5 w-5" /></button></div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
          onClick={() => document.getElementById("edition-file-input")?.click()}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          {analyzing ? (
            <p className="text-sm text-primary">Analyse en cours…</p>
          ) : pdf ? (
            <div className="text-sm">
              <p className="font-medium truncate">{pdf.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{(pdf.size / 1024 / 1024).toFixed(2)} Mo · {form.page_count} page(s) détectée(s)</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">Glissez-déposez le document ici</p>
              <p className="text-xs text-muted-foreground mt-1">PDF ou Word (.pdf, .doc, .docx) — analyse automatique</p>
            </>
          )}
          <input id="edition-file-input" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>

        <label className="block text-xs"><span className="text-muted-foreground">Journal</span>
          <select value={form.newspaper_id} onChange={(e) => setForm({ ...form, newspaper_id: e.target.value })} className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-background text-sm">
            <option value="">—</option>
            {newspapers.map((n: any) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </label>
        <Input label="Date d'édition" type="date" value={form.edition_date} onChange={(v) => setForm({ ...form, edition_date: v })} />
        <Input label="Titre de la une (optionnel)" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Input label="Nombre de pages (auto)" type="number" value={String(form.page_count)} onChange={(v) => setForm({ ...form, page_count: Math.max(1, parseInt(v) || 1) })} />

        {showSummary && (
          <Input label="Contenu extrait" value={form.summary || extractedText.slice(0, 500)} onChange={(v) => setForm({ ...form, summary: v })} />
        )}

        <label className="block text-xs"><span className="text-muted-foreground">Couverture (image — optionnel)</span>
          <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} className="mt-1 text-xs" />
        </label>
        <button disabled={saving || analyzing} onClick={save} className="w-full h-11 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60">
          {saving ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Publier (notifie tous les utilisateurs)"}
        </button>
      </div>
    </div>
  );
}

// === USERS ===
function UsersAdmin() {
  const qc = useQueryClient();
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id,email,display_name,avatar_url,created_at").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("user_id,role");
      return (profiles ?? []).map((p: any) => ({
        ...p,
        isAdmin: roles?.some((r: any) => r.user_id === p.user_id && r.role === "admin") ?? false,
      }));
    },
  });

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) return toast.error(error.message);
    }
    toast.success("Rôle mis à jour");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <>
      <h1 className="text-2xl font-bold">Utilisateurs & rôles</h1>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="text-left p-3">Utilisateur</th><th className="text-left p-3">Email</th><th className="text-left p-3">Rôle</th><th className="text-right p-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u: any) => (
              <tr key={u.user_id}>
                <td className="p-3 flex items-center gap-2">
                  {u.avatar_url ? <img src={u.avatar_url} className="h-8 w-8 rounded-full object-cover" alt="" />
                    : <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold">{(u.display_name || u.email).slice(0,2).toUpperCase()}</div>}
                  <span className="font-medium">{u.display_name ?? "—"}</span>
                </td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3">
                  {u.isAdmin ? <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">Admin</span>
                    : <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">Utilisateur</span>}
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => toggleAdmin(u.user_id, u.isAdmin)}
                    disabled={u.email === "giannyfoapa@gmail.com"}
                    className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-40 inline-flex items-center gap-1">
                    {u.isAdmin ? <><ShieldOff className="h-3 w-3" /> Retirer admin</> : <><ShieldCheck className="h-3 w-3" /> Promouvoir admin</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// === SOURCES (admin reference only) ===
function SourcesAdmin() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data: sources = [] } = useQuery({
    queryKey: ["admin-sources"],
    queryFn: async () => (await supabase.from("regulation_sources").select("*").order("name")).data ?? [],
  });

  const refresh = async () => {
    setRefreshing(true);
    try {
      const r = await fetch("/api/public/refresh-news", { method: "POST" });
      if (r.ok) toast.success("Flux d'actualités rafraîchi");
      else toast.error("Échec du rafraîchissement");
    } catch { toast.error("Erreur réseau"); }
    setRefreshing(false);
    qc.invalidateQueries({ queryKey: ["news-feed"] });
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sources règlementations</h1>
        <button onClick={refresh} disabled={refreshing} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Rafraîchir le flux d'actualités
        </button>
      </div>
      <p className="text-sm text-muted-foreground">Les règlementations sont récupérées automatiquement depuis ces sources officielles. L'admin n'a pas à publier manuellement — toute nouvelle réforme déclenche une notification auprès des utilisateurs.</p>
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {sources.map((s: any) => (
          <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 hover:bg-accent transition">
            <div>
              <p className="font-medium text-sm">{s.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.url}</p>
              {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
            </div>
            <Globe className="h-4 w-4 text-primary" />
          </a>
        ))}
      </div>
    </>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-background text-sm" />
    </label>
  );
}
