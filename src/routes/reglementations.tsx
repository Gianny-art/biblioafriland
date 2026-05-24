import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Scale, Plus, ExternalLink, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";
import { MotifBg } from "@/components/Motif";
import { toast } from "sonner";

export const Route = createFileRoute("/reglementations")({
  head: () => ({ meta: [{ title: "Règlementations — COBAC, CEMAC, BEAC" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});

const SOURCES = ["Toutes", "COBAC", "CEMAC", "BEAC", "Autre"] as const;

function Page() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [source, setSource] = useState<(typeof SOURCES)[number]>("Toutes");
  const [openNew, setOpenNew] = useState(false);
  const [openItem, setOpenItem] = useState<any>(null);

  const { data: regs = [] } = useQuery({
    queryKey: ["regulations", source],
    queryFn: async () => {
      let q = supabase.from("regulations").select("*").order("published_at", { ascending: false });
      if (source !== "Toutes") q = q.eq("source", source);
      return (await q).data ?? [];
    },
  });

  return (
    <div className="space-y-6 relative">
      <MotifBg opacity={0.05} />
      <div className="relative flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Scale className="h-7 w-7 text-primary" /> Règlementations</h1>
          <p className="text-sm text-muted-foreground mt-1">COBAC · CEMAC · BEAC — Toutes les réformes en vigueur, mises à jour en temps réel.</p>
        </div>
        {role === "admin" && (
          <button onClick={() => setOpenNew(true)} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" /> Publier une règlementation
          </button>
        )}
      </div>

      <div className="relative flex gap-2 overflow-x-auto pb-1">
        {SOURCES.map((s) => (
          <button key={s} onClick={() => setSource(s)}
            className={`h-9 px-4 rounded-full text-xs font-semibold whitespace-nowrap border ${source === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="relative grid md:grid-cols-2 gap-4">
        {regs.map((r: any) => (
          <button key={r.id} onClick={() => setOpenItem(r)} className="text-left bg-card border border-border rounded-xl p-5 hover:shadow-elegant transition group">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">{r.source}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.published_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span>
            </div>
            <h3 className="font-semibold group-hover:text-primary transition">{r.title}</h3>
            {r.summary && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{r.summary}</p>}
            <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
              {r.pdf_url && <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> PDF</span>}
              {r.external_url && <span className="flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Lien</span>}
            </div>
          </button>
        ))}
        {regs.length === 0 && <p className="text-muted-foreground text-sm col-span-full text-center py-12">Aucune règlementation.</p>}
      </div>

      {openItem && <Detail item={openItem} onClose={() => setOpenItem(null)} />}
      {openNew && role === "admin" && (
        <NewRegulationDialog onClose={() => setOpenNew(false)} onSaved={() => { setOpenNew(false); qc.invalidateQueries({ queryKey: ["regulations"] }); }} />
      )}
    </div>
  );
}

function Detail({ item, onClose }: { item: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">{item.source}</span>
            <h2 className="text-xl font-bold mt-2">{item.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">Publiée le {new Date(item.published_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded"><X className="h-5 w-5" /></button>
        </div>
        {item.summary && <p className="text-sm text-muted-foreground mb-4 italic">{item.summary}</p>}
        {item.content && <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">{item.content}</div>}
        <div className="flex flex-wrap gap-2 mt-6">
          {item.pdf_url && <a href={item.pdf_url} target="_blank" rel="noreferrer" className="h-9 px-3 rounded-md border border-border text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Voir le PDF</a>}
          {item.external_url && <a href={item.external_url} target="_blank" rel="noreferrer" className="h-9 px-3 rounded-md border border-border text-sm flex items-center gap-2"><ExternalLink className="h-4 w-4" /> Source</a>}
        </div>
      </div>
    </div>
  );
}

function NewRegulationDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: "", source: "COBAC", summary: "", content: "", external_url: "", published_at: new Date().toISOString().slice(0, 10) });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title) return toast.error("Titre requis");
    setSaving(true);
    let pdf_url: string | null = null;
    if (pdfFile) {
      const path = `regulations/${Date.now()}-${pdfFile.name}`;
      const { error } = await supabase.storage.from("newspaper-pdfs").upload(path, pdfFile);
      if (error) { toast.error(error.message); setSaving(false); return; }
      pdf_url = supabase.storage.from("newspaper-pdfs").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("regulations").insert({ ...form, pdf_url });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Règlementation publiée — tous les utilisateurs ont été notifiés"); onSaved(); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-bold text-lg">Nouvelle règlementation</h2><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <Input label="Titre" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <label className="block text-xs"><span className="text-muted-foreground">Source</span>
          <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-background text-sm">
            {["COBAC","CEMAC","BEAC","Autre"].map((s) => <option key={s}>{s}</option>)}
          </select></label>
        <Input label="Date de publication" type="date" value={form.published_at} onChange={(v) => setForm({ ...form, published_at: v })} />
        <Input label="Résumé" value={form.summary} onChange={(v) => setForm({ ...form, summary: v })} />
        <label className="block text-xs"><span className="text-muted-foreground">Contenu</span>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm" /></label>
        <Input label="Lien externe (optionnel)" value={form.external_url} onChange={(v) => setForm({ ...form, external_url: v })} />
        <label className="block text-xs"><span className="text-muted-foreground">PDF (optionnel)</span>
          <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} className="mt-1 w-full text-sm" /></label>
        <button disabled={saving} onClick={save} className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60">
          {saving ? "Publication…" : "Publier et notifier tous les utilisateurs"}
        </button>
      </div>
    </div>
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
