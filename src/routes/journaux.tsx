import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { NewspaperLogo } from "@/components/NewspaperLogo";
import { Filter } from "lucide-react";

export const Route = createFileRoute("/journaux")({
  head: () => ({ meta: [{ title: "Journaux — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});

function Page() {
  const [tab, setTab] = useState<"archives" | "recent" | "downloads">("archives");
  const [newspaperId, setNewspaperId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");

  const { data: newspapers = [] } = useQuery({
    queryKey: ["newspapers"],
    queryFn: async () => (await supabase.from("newspapers").select("id,name,slug,frequency,category:categories(name,slug)").order("name")).data ?? [],
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("id,name,slug")).data ?? [],
  });

  const { data: editions = [] } = useQuery({
    queryKey: ["editions", newspaperId, categoryId, tab],
    queryFn: async () => {
      let q = supabase.from("editions").select("id, edition_date, title, page_count, newspaper:newspapers!inner(id,name,slug,frequency,category_id,category:categories(name,slug))").order("edition_date", { ascending: false }).limit(60);
      if (newspaperId) q = q.eq("newspaper_id", newspaperId);
      if (categoryId) q = q.eq("newspaper.category_id", categoryId);
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Bibliothèque</h1>
      </div>

      <div className="flex gap-6 border-b border-border">
        {[
          { k: "archives", label: "Archives" },
          { k: "recent", label: "Parutions récentes" },
          { k: "downloads", label: "Mes téléchargements" },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px ${tab === t.k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
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
        <button className="h-9 px-3 rounded-md border border-border bg-card text-sm flex items-center gap-2">
          <Filter className="h-4 w-4" /> Filtrer
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {editions.map((e: any) => (
          <Link key={e.id} to="/lecteur/$editionId" params={{ editionId: e.id }} className="group">
            <NewspaperLogo slug={e.newspaper.slug} name={e.newspaper.name} className="aspect-[3/4] mb-2 group-hover:shadow-elegant transition" />
            <p className="font-medium text-sm truncate">{e.newspaper.name}</p>
            <p className="text-xs text-muted-foreground">{new Date(e.edition_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</p>
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground inline-block mt-1">{e.newspaper.category?.name ?? "Général"}</span>
          </Link>
        ))}
        {editions.length === 0 && <p className="text-muted-foreground text-sm col-span-full text-center py-12">Aucune parution.</p>}
      </div>
    </div>
  );
}
