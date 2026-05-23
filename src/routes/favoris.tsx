import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";
import { NewspaperLogo } from "@/components/NewspaperLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/favoris")({
  head: () => ({ meta: [{ title: "Mes favoris — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"articles" | "journaux">("articles");

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("favorites")
      .select("id, edition_id, article_id, edition:editions(id,edition_date,title,newspaper:newspapers(name,slug)), article:articles(id,title,page_number,edition:editions(id,edition_date,newspaper:newspapers(name,slug)))")
      .eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const remove = async (id: string) => {
    await supabase.from("favorites").delete().eq("id", id);
    toast.success("Favori supprimé");
    qc.invalidateQueries({ queryKey: ["favorites"] });
  };

  const articles = favorites.filter((f: any) => f.article_id);
  const journaux = favorites.filter((f: any) => f.edition_id && !f.article_id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Mes favoris</h1>
      <div className="flex gap-6 border-b border-border">
        <button onClick={() => setTab("articles")}
          className={`pb-3 text-sm font-medium border-b-2 -mb-px ${tab === "articles" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          Articles ({articles.length})
        </button>
        <button onClick={() => setTab("journaux")}
          className={`pb-3 text-sm font-medium border-b-2 -mb-px ${tab === "journaux" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          Journaux ({journaux.length})
        </button>
      </div>

      <div className="space-y-3">
        {(tab === "articles" ? articles : journaux).map((f: any) => {
          const e = f.article?.edition ?? f.edition;
          const np = e?.newspaper;
          return (
            <div key={f.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
              <NewspaperLogo slug={np?.slug ?? ""} name={np?.name ?? ""} className="w-12 h-16 shrink-0" />
              <div className="flex-1 min-w-0">
                <Link to="/lecteur/$editionId" params={{ editionId: e?.id }} className="font-medium text-sm hover:text-primary">
                  {f.article?.title ?? e?.title ?? np?.name}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">{np?.name} {f.article ? ` • P.${f.article.page_number}` : ""} • {new Date(e?.edition_date).toLocaleDateString("fr-FR")}</p>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">PDF</span>
              <button onClick={() => remove(f.id)} className="p-2 hover:bg-accent rounded"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
            </div>
          );
        })}
        {(tab === "articles" ? articles : journaux).length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-12">Aucun favori.</p>
        )}
      </div>
    </div>
  );
}
