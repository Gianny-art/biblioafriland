import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, Newspaper, Users, Bell, FileText, Plus, X, Upload, Scale, ShieldCheck, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";
import { MotifBg } from "@/components/Motif";
import { toast } from "sonner";

export const Route = createFileRoute("/administration")({
  head: () => ({ meta: [{ title: "Administration — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});

type Tab = "dashboard" | "editions" | "users" | "regulations" | "activity";

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
          { k: "editions", icon: Newspaper, label: "Journaux & parutions" },
          { k: "regulations", icon: Scale, label: "Règlementations" },
          { k: "users", icon: Users, label: "Utilisateurs & rôles" },
          { k: "activity", icon: FileText, label: "Journal d'activité" },
        ].map((it) => (
          <button key={it.k} onClick={() => setTab(it.k as Tab)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${tab === it.k ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
            <it.icon className="h-4 w-4" /> {it.label}
          </button>
        ))}
      </aside>

      <div className="relative space-y-6">
        {tab === "dashboard" && <Dashboard />}
        {tab === "editions" && <EditionsAdmin />}
        {tab === "regulations" && <RegulationsAdmin />}
        {tab === "users" && <UsersAdmin />}
        {tab === "activity" && <ActivityAdmin />}
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

function EditionsAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: editions = [] } = useQuery({
    queryKey: ["admin-editions"],
    queryFn: async () => (await supabase.from("editions").select("id, edition_date, title, page_count, pdf_url, cover_url, newspaper:newspapers(id,name,slug)").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Journaux & parutions</h1>
        <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" /> Charger une parution
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="text-left p-3">Journal</th><th className="text-left p-3">Édition</th><th className="text-left p-3">Pages</th><th className="text-left p-3">Statut</th></tr>
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
              </tr>
            ))}
            {editions.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Aucune parution.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && <UploadEditionDialog onClose={() => setOpen(false)} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admin-editions"] }); }} />}
    </>
  );
}

function UploadEditionDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const { data: newspapers = [] } = useQuery({
    queryKey: ["admin-newspapers-select"],
    queryFn: async () => (await supabase.from("newspapers").select("id,name").order("name")).data ?? [],
  });
  const [form, setForm] = useState({ newspaper_id: "", edition_date: new Date().toISOString().slice(0, 10), title: "", summary: "", page_count: 12 });
  const [pdf, setPdf] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.newspaper_id) return toast.error("Sélectionnez un journal");
    setSaving(true);
    let pdf_url: string | null = null;
    let cover_url: string | null = null;
    if (pdf) {
      const path = `editions/${form.newspaper_id}/${form.edition_date}-${Date.now()}.pdf`;
      const { error } = await supabase.storage.from("newspaper-pdfs").upload(path, pdf);
      if (error) { setSaving(false); return toast.error(error.message); }
      pdf_url = supabase.storage.from("newspaper-pdfs").getPublicUrl(path).data.publicUrl;
    }
    if (cover) {
      const path = `covers/${form.newspaper_id}/${form.edition_date}-${Date.now()}.${cover.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("newspaper-pdfs").upload(path, cover);
      if (error) { setSaving(false); return toast.error(error.message); }
      cover_url = supabase.storage.from("newspaper-pdfs").getPublicUrl(path).data.publicUrl;
    }
    const { data: ed, error } = await supabase.from("editions").insert({
      newspaper_id: form.newspaper_id, edition_date: form.edition_date,
      title: form.title || null, summary: form.summary || null,
      page_count: form.page_count, pdf_url, cover_url,
    }).select().single();
    if (error) { setSaving(false); return toast.error(error.message); }

    // Auto-sectionner : créer les pages (références au PDF, viewer rend page par page)
    if (ed) {
      const pageRows = Array.from({ length: form.page_count }, (_, i) => ({
        edition_id: ed.id, page_number: i + 1, image_url: pdf_url ? `${pdf_url}#page=${i + 1}` : null,
      }));
      await supabase.from("edition_pages").insert(pageRows);
    }
    await supabase.from("activity_log").insert({ user_id: user?.id, user_display: user?.email, action: "Parution chargée", target_type: "edition", target_id: ed?.id });
    setSaving(false);
    toast.success("Parution publiée — utilisateurs notifiés automatiquement");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-bold text-lg">Charger une parution</h2><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <label className="block text-xs"><span className="text-muted-foreground">Journal</span>
          <select value={form.newspaper_id} onChange={(e) => setForm({ ...form, newspaper_id: e.target.value })} className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-background text-sm">
            <option value="">—</option>
            {newspapers.map((n: any) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </label>
        <Input label="Date d'édition" type="date" value={form.edition_date} onChange={(v) => setForm({ ...form, edition_date: v })} />
        <Input label="Titre de la une (optionnel)" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Input label="Résumé (optionnel)" value={form.summary} onChange={(v) => setForm({ ...form, summary: v })} />
        <Input label="Nombre de pages" type="number" value={String(form.page_count)} onChange={(v) => setForm({ ...form, page_count: Math.max(1, parseInt(v) || 1) })} />
        <label className="block text-xs"><span className="text-muted-foreground">Fichier PDF du journal</span>
          <div className="mt-1 flex items-center gap-2 p-3 border border-dashed border-border rounded-md">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} className="text-xs" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Le PDF sera automatiquement sectionné page par page dans la visionneuse.</p>
        </label>
        <label className="block text-xs"><span className="text-muted-foreground">Image de couverture (annonce dans la bibliothèque)</span>
          <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} className="mt-1 text-xs" />
        </label>
        <button disabled={saving} onClick={save} className="w-full h-11 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60">
          {saving ? "Publication…" : "Publier (notifie tous les utilisateurs)"}
        </button>
      </div>
    </div>
  );
}

function RegulationsAdmin() {
  const { data: regs = [] } = useQuery({
    queryKey: ["admin-regs"],
    queryFn: async () => (await supabase.from("regulations").select("id,title,source,published_at").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Règlementations</h1>
        <Link to="/reglementations" className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" /> Gérer dans l'espace public
        </Link>
      </div>
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {regs.map((r: any) => (
          <div key={r.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{r.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.source} · {new Date(r.published_at).toLocaleDateString("fr-FR")}</p>
            </div>
          </div>
        ))}
        {regs.length === 0 && <p className="p-8 text-center text-muted-foreground text-sm">Aucune règlementation.</p>}
      </div>
    </>
  );
}

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

function ActivityAdmin() {
  const { data: activity = [] } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => (await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(40)).data ?? [],
  });
  return (
    <>
      <h1 className="text-2xl font-bold">Journal d'activité</h1>
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {activity.map((a: any) => (
          <div key={a.id} className="p-4 text-sm flex items-center justify-between">
            <div><span className="font-medium">{a.user_display ?? "Système"}</span> <span className="text-muted-foreground">— {a.action}</span></div>
            <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("fr-FR")}</span>
          </div>
        ))}
        {activity.length === 0 && <p className="p-8 text-center text-muted-foreground">Aucune activité.</p>}
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
