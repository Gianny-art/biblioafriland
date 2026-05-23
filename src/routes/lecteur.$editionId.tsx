import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Heart, Printer, Share2, ArrowLeft, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";
import { NewspaperLogo } from "@/components/NewspaperLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/lecteur/$editionId")({
  head: () => ({ meta: [{ title: "Lecteur — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Reader /></AppLayout>,
});

function Reader() {
  const { editionId } = useParams({ from: "/lecteur/$editionId" });
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data: edition } = useQuery({
    queryKey: ["edition", editionId],
    queryFn: async () => (await supabase.from("editions")
      .select("id, title, edition_date, page_count, summary, pdf_url, newspaper:newspapers(id,name,slug)")
      .eq("id", editionId).single()).data,
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["edition-articles", editionId],
    queryFn: async () => (await supabase.from("articles").select("id,title,page_number,content").eq("edition_id", editionId).order("page_number")).data ?? [],
  });

  const fav = async () => {
    if (!user) return;
    await supabase.from("favorites").insert({ user_id: user.id, edition_id: editionId });
    toast.success("Ajouté aux favoris");
  };
  const download = async () => {
    if (!user) return;
    await supabase.from("downloads").insert({ user_id: user.id, edition_id: editionId });
    toast.success("Téléchargement enregistré");
  };

  if (!edition) return <p>Chargement…</p>;
  const total = edition.page_count ?? 24;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/journaux" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="text-center">
          <h1 className="font-semibold">{edition.newspaper.name}</h1>
          <p className="text-xs text-muted-foreground">{new Date(edition.edition_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fav} className="p-2 rounded hover:bg-accent" title="Favori"><Heart className="h-4 w-4" /></button>
          <button onClick={download} className="p-2 rounded hover:bg-accent" title="Télécharger"><Download className="h-4 w-4" /></button>
          <button onClick={() => window.print()} className="p-2 rounded hover:bg-accent" title="Imprimer"><Printer className="h-4 w-4" /></button>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Lien copié"); }} className="p-2 rounded hover:bg-accent" title="Partager"><Share2 className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[200px_1fr] gap-4">
        {/* Sommaire pages */}
        <aside className="bg-card border border-border rounded-xl p-3 max-h-[70vh] overflow-y-auto">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 px-2">Pages</p>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`aspect-[3/4] rounded border text-xs ${p === page ? "border-primary ring-2 ring-primary/30" : "border-border"} bg-muted/40 hover:bg-muted`}>
                <NewspaperLogo slug={edition.newspaper.slug} name={edition.newspaper.name} className="w-full h-full" />
                <span className="block text-[10px] text-muted-foreground mt-1">Page {p}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Viewer */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="aspect-[3/4] max-h-[75vh] mx-auto rounded-md overflow-hidden bg-white shadow-card flex items-center justify-center">
            {edition.pdf_url ? (
              <iframe src={`${edition.pdf_url}#page=${page}`} className="w-full h-full" />
            ) : (
              <div className="text-center p-8">
                <NewspaperLogo slug={edition.newspaper.slug} name={edition.newspaper.name} className="w-40 h-52 mx-auto" />
                <p className="mt-6 text-2xl font-bold">{edition.title ?? edition.newspaper.name}</p>
                <p className="text-sm text-muted-foreground mt-2">Édition du {new Date(edition.edition_date).toLocaleDateString("fr-FR")}</p>
                <p className="text-xs text-muted-foreground mt-4">Page {page} / {total}</p>
                {articles.filter((a: any) => a.page_number === page).map((a: any) => (
                  <div key={a.id} className="mt-6 text-left max-w-md mx-auto">
                    <h3 className="font-bold">{a.title}</h3>
                    {a.content && <p className="text-sm text-muted-foreground mt-2">{a.content}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-4">
            <button onClick={() => setPage(Math.max(1, page - 1))} className="p-2 rounded hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm">Page {page} / {total}</span>
            <button onClick={() => setPage(Math.min(total, page + 1))} className="p-2 rounded hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {articles.length > 0 && (
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4" /> Sommaire des articles</h2>
          <ul className="divide-y divide-border">
            {articles.map((a: any) => (
              <li key={a.id}>
                <button onClick={() => setPage(a.page_number)} className="w-full text-left py-2 flex items-center justify-between hover:text-primary">
                  <span className="text-sm">{a.title}</span>
                  <span className="text-xs text-muted-foreground">P.{a.page_number}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
