import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Star, FileText, Filter as FilterIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/recherche")({
  head: () => ({ meta: [{ title: "Recherche avancée — Bibliothèque numérique" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ q: (s.q as string) ?? "" }),
  component: () => <AppLayout><Page /></AppLayout>,
});

function Page() {
  const { q: initial } = useSearch({ from: "/recherche" });
  const { user } = useAuth();
  const [q, setQ] = useState(initial);
  const [period, setPeriod] = useState("all");
  const [categoryId, setCategoryId] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("id,name")).data ?? [],
  });

  const { data: articles = [], isFetching } = useQuery({
    queryKey: ["search", q, period, categoryId],
    queryFn: async () => {
      if (!q.trim()) return [];
      let req = supabase.from("articles")
        .select("id, title, page_number, author, content, keywords, edition:editions(id, edition_date, newspaper:newspapers(name, slug, category_id, category:categories(name)))")
        .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
        .limit(50);
      const { data } = await req;
      let res = data ?? [];
      if (period !== "all") {
        const days = period === "today" ? 1 : period === "7" ? 7 : period === "30" ? 30 : 365;
        const min = new Date(Date.now() - days * 86400000);
        res = res.filter((a: any) => new Date(a.edition.edition_date) >= min);
      }
      if (categoryId) res = res.filter((a: any) => a.edition.newspaper.category_id === categoryId);
      return res;
    },
  });

  useEffect(() => {
    if (q.trim() && user) {
      supabase.from("search_history").insert({ user_id: user.id, query: q });
    }
  }, [q]);

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6">
      <aside className="bg-card border border-border rounded-xl p-5 h-fit space-y-5">
        <div>
          <p className="font-semibold text-sm flex items-center gap-2"><FilterIcon className="h-4 w-4" /> Affiner les résultats</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Période</p>
          <div className="space-y-1.5">
            {[["all", "Tout"], ["today", "Aujourd'hui"], ["7", "7 derniers jours"], ["30", "30 derniers jours"], ["365", "Personnalisée"]].map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="period" checked={period === v} onChange={() => setPeriod(v as string)} className="accent-primary" />
                {l}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Catégorie</p>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={!categoryId} onChange={() => setCategoryId("")} className="accent-primary" />Toutes
            </label>
            {categories.map((c: any) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="radio" checked={categoryId === c.id} onChange={() => setCategoryId(c.id)} className="accent-primary" />{c.name}
              </label>
            ))}
          </div>
        </div>
      </aside>

      <div className="space-y-5">
        <div>
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Mot-clé, titre, auteur..."
            className="w-full h-11 px-4 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Résultats de recherche</h2>
          <span className="text-xs text-muted-foreground">{isFetching ? "Recherche…" : `${articles.length} résultats trouvés${q ? ` pour "${q}"` : ""}`}</span>
        </div>
        <div className="space-y-3">
          {articles.map((a: any) => (
            <Link key={a.id} to="/lecteur/$editionId" params={{ editionId: a.edition.id }}
              className="block bg-card border border-border rounded-lg p-4 hover:shadow-elegant transition">
              <div className="flex items-start gap-4">
                <div className="h-16 w-12 rounded bg-muted shrink-0 grid place-items-center text-xs text-muted-foreground">PDF</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{a.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {a.edition.newspaper.name} • P.{a.page_number} • {new Date(a.edition.edition_date).toLocaleDateString("fr-FR")}
                  </p>
                  {a.content && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{a.content}</p>}
                </div>
                <Star className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
          {!isFetching && articles.length === 0 && q && (
            <p className="text-center text-muted-foreground text-sm py-12">Aucun résultat pour "{q}".</p>
          )}
          {!q && <p className="text-center text-muted-foreground text-sm py-12">Saisissez un mot-clé pour lancer la recherche.</p>}
        </div>
      </div>
    </div>
  );
}
