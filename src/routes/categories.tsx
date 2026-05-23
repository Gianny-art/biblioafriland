import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Newspaper } from "lucide-react";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Catégories — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});

function Page() {
  const { data = [] } = useQuery({
    queryKey: ["cats-with-counts"],
    queryFn: async () => {
      const { data: cats } = await supabase.from("categories").select("id,name,slug,color");
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((c: any) => (
          <Link key={c.id} to="/journaux"
            className="bg-card border border-border rounded-xl p-5 hover:shadow-elegant transition group">
            <div className="h-10 w-10 rounded-md grid place-items-center mb-3"
              style={{ backgroundColor: `${c.color}20`, color: c.color }}>
              <Newspaper className="h-5 w-5" />
            </div>
            <h3 className="font-semibold group-hover:text-primary">{c.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{c.count} {c.count > 1 ? "titres" : "titre"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
