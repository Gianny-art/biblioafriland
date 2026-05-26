import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Catégories — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});

function Page() {
  const { data = [] } = useQuery({
    queryKey: ["cats-with-counts"],
    queryFn: async () => {
      const { data: cats } = await supabase.from("categories").select("id,name,slug,color,image_url");
      const { data: papers } = await supabase.from("newspapers").select("id,category_id");
      return (cats ?? []).map((c: any) => ({
        ...c,
        count: (papers ?? []).filter((p: any) => p.category_id === c.id).length,
      }));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Catégories</h1>
        <p className="text-muted-foreground text-sm mt-1">Explorez le fonds documentaire par thématique.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {data.map((c: any) => (
          <Link
            key={c.id}
            to="/journaux"
            className="group relative h-56 rounded-lg overflow-hidden border border-border shadow-card hover:shadow-elegant transition"
          >
            <img
              src={c.image_url || "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&q=80"}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full mb-3"
                style={{ backgroundColor: c.color || "#dc2626" }}
              />
              <h3 className="font-bold text-xl tracking-tight">{c.name}</h3>
              <p className="text-xs text-white/80 mt-1 uppercase tracking-wider">
                {c.count} {c.count > 1 ? "titres" : "titre"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
