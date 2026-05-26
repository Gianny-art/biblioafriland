import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, Share2, ArrowLeft, FileText, Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";
import { NewspaperLogo, badgeFor } from "@/components/NewspaperLogo";
import { PdfPage, getPdfPageCount } from "@/components/PdfPage";
import { toast } from "sonner";

export const Route = createFileRoute("/lecteur/$editionId")({
  head: () => ({ meta: [{ title: "Lecteur — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Reader /></AppLayout>,
});

function Reader() {
  const { editionId } = useParams({ from: "/lecteur/$editionId" });
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  const { data: edition } = useQuery({
    queryKey: ["edition", editionId],
    queryFn: async () => (await supabase.from("editions")
      .select("id, title, edition_date, page_count, summary, pdf_url, cover_url, newspaper:newspapers(id,name,slug)")
      .eq("id", editionId).maybeSingle()).data,
  });

  const { data: pages = [] } = useQuery({
    queryKey: ["edition-pages", editionId],
    queryFn: async () => (await supabase.from("edition_pages").select("page_number,image_url").eq("edition_id", editionId).order("page_number")).data ?? [],
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["edition-articles", editionId],
    queryFn: async () => (await supabase.from("articles").select("id,title,page_number,content").eq("edition_id", editionId).order("page_number")).data ?? [],
  });

  // Enregistre la consultation
  useEffect(() => {
    if (user && editionId) supabase.from("downloads").insert({ user_id: user.id, edition_id: editionId }).then(() => {});
  }, [user, editionId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
      if (e.key === "ArrowRight") setPage((p) => p + 1);
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fav = async () => {
    if (!user) return;
    await supabase.from("favorites").insert({ user_id: user.id, edition_id: editionId });
    toast.success("Ajouté aux favoris");
  };
  const toggleFs = async () => {
    setFullscreen(!fullscreen);
    try {
      if (!document.fullscreenElement && viewerRef.current) await viewerRef.current.requestFullscreen();
      else if (document.fullscreenElement) await document.exitFullscreen();
    } catch {}
  };

  // PDF page count detection (autoritative when pdf is loaded)
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  useEffect(() => {
    if (!edition?.pdf_url) return;
    getPdfPageCount(edition.pdf_url).then(setPdfPageCount).catch(() => {});
  }, [edition?.pdf_url]);

  if (!edition) return <p className="text-center py-12 text-muted-foreground">Chargement…</p>;
  const total = pdfPageCount ?? edition.page_count ?? Math.max(pages.length, 1);
  const currentPageImg = pages.find((p: any) => p.page_number === page)?.image_url;
  const hasPdf = !!edition.pdf_url;
  const badge = badgeFor(edition.edition_date);

  return (
    <div className="space-y-4 select-none" onContextMenu={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link to="/journaux" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="text-center min-w-0">
          <h1 className="font-semibold truncate flex items-center gap-2 justify-center">
            {edition.newspaper.name}
            {badge === "new" && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary text-primary-foreground">Nouveau</span>}
          </h1>
          <p className="text-xs text-muted-foreground">{new Date(edition.edition_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={fav} className="p-2 rounded hover:bg-accent" title="Favori"><Heart className="h-4 w-4" /></button>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Lien copié"); }} className="p-2 rounded hover:bg-accent" title="Partager"><Share2 className="h-4 w-4" /></button>
          <button onClick={toggleFs} className="p-2 rounded hover:bg-accent" title="Plein écran">
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[200px_1fr] gap-4">
        <aside className="hidden lg:block bg-card border border-border rounded-xl p-3 max-h-[75vh] overflow-y-auto">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 px-2">Pages</p>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: total }, (_, i) => i + 1).map((p) => {
              const img = pages.find((pg: any) => pg.page_number === p)?.image_url;
              const isImageUrl = img && !/#page=/.test(img);
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`relative aspect-[3/4] rounded border overflow-hidden bg-white ${p === page ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
                  {isImageUrl ? (
                    <img src={img} alt={`Page ${p}`} loading="lazy" className="w-full h-full object-cover pointer-events-none" />
                  ) : hasPdf ? (
                    <PdfPage url={edition.pdf_url!} pageNumber={p} scale={0.4} fit="width" />
                  ) : (
                    <div className="w-full h-full bg-muted/40 grid place-items-center text-[10px] text-muted-foreground">P. {p}</div>
                  )}
                  <span className="absolute bottom-0 left-0 right-0 text-[9px] bg-black/50 text-white text-center py-0.5">Page {p}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div ref={viewerRef} className={`bg-card border border-border rounded-xl p-4 ${fullscreen ? "fixed inset-0 z-50 rounded-none" : ""}`}>
          <div className={`${fullscreen ? "h-[calc(100vh-80px)]" : "h-[70vh] sm:h-[85vh]"} mx-auto rounded-md overflow-hidden bg-white shadow-card flex items-center justify-center relative`}>
            {currentPageImg && !/#page=/.test(currentPageImg) ? (
              <img src={currentPageImg} alt={`Page ${page}`} draggable={false} className="max-h-full max-w-full object-contain pointer-events-none" />
            ) : hasPdf ? (
              <PdfPage url={edition.pdf_url!} pageNumber={page} scale={2} />
            ) : (
              <div className="text-center p-8 max-w-md">
                {edition.cover_url
                  ? <img src={edition.cover_url} alt="" className="w-40 h-52 mx-auto object-cover rounded" />
                  : <NewspaperLogo slug={edition.newspaper.slug} name={edition.newspaper.name} className="w-40 h-52 mx-auto" />}
                <p className="mt-6 text-2xl font-bold">{edition.title ?? edition.newspaper.name}</p>
                <p className="text-sm text-muted-foreground mt-2">Édition du {new Date(edition.edition_date).toLocaleDateString("fr-FR")}</p>
                <p className="text-xs text-muted-foreground mt-4">Page {page} / {total}</p>
                {articles.filter((a: any) => a.page_number === page).map((a: any) => (
                  <div key={a.id} className="mt-6 text-left">
                    <h3 className="font-bold">{a.title}</h3>
                    {a.content && <p className="text-sm text-muted-foreground mt-2">{a.content}</p>}
                  </div>
                ))}
              </div>
            )}
            <div className="absolute bottom-2 right-3 text-[10px] text-black/30 uppercase tracking-widest font-bold pointer-events-none">
              {user?.email} · Afriland confidentiel
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <button onClick={() => setPage(Math.max(1, page - 1))} className="h-10 px-3 rounded hover:bg-accent flex items-center gap-1 text-sm">
              <ChevronLeft className="h-4 w-4" /> Préc.
            </button>
            <span className="text-sm font-medium">Page {page} / {total}</span>
            <button onClick={() => setPage(Math.min(total, page + 1))} className="h-10 px-3 rounded hover:bg-accent flex items-center gap-1 text-sm">
              Suiv. <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {articles.length > 0 && !fullscreen && (
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

      <style>{`@media print { body { display: none !important; } }`}</style>
    </div>
  );
}
