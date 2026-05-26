import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Eye, BookMarked, Search as SearchIcon, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";
import { NewspaperLogo } from "@/components/NewspaperLogo";
import NewsTicker from "@/components/NewsTicker";



export const Route = createFileRoute("/")({
  component: () => (
    <AppLayout>
      <Home />
    </AppLayout>
  ),
});

function Home() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const { data: todayEditions = [] } = useQuery({
    queryKey: ["editions-today"],
    queryFn: async () => {
      const { data } = await supabase
        .from("editions")
        .select(
          "id, title, edition_date, page_count, newspaper:newspapers(id,name,slug,frequency,category:categories(name,slug,color))",
        )
        .order("created_at", { ascending: false })
        .limit(12);
      return data ?? [];
    },
  });

  const { data: recommended = [] } = useQuery({
    queryKey: ["recommended"],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select(
          "id, title, page_number, edition:editions(id, edition_date, newspaper:newspapers(name, slug, category:categories(name)))",
        )
        .limit(3);
      return data ?? [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [downloads, searches, alerts] = await Promise.all([
        supabase.from("downloads").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("search_history").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("alerts").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      return { downloads: downloads.count ?? 0, searches: searches.count ?? 0, alerts: alerts.count ?? 0 };
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-greet", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("display_name").eq("user_id", user!.id).single()).data,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Bonjour {profile?.display_name ?? ""}</h1>
        <p className="text-muted-foreground text-sm mt-1">Voici les dernières parutions disponibles</p>
      </div>

      <section className="bg-card rounded-xl border border-border p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">À la une aujourd'hui</h2>
          <Link to="/journaux" className="text-sm text-primary">
            Voir tout
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {todayEditions.slice(0, 5).map((e: any) => (
            <Link key={e.id} to="/lecteur/$editionId" params={{ editionId: e.id }} className="group">
              <NewspaperLogo
                slug={e.newspaper.slug}
                name={e.newspaper.name}
                className="aspect-[3/4] mb-2 group-hover:shadow-elegant transition"
              />
              <p className="font-medium text-sm truncate">{e.newspaper.name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(e.edition_date).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              {e.newspaper.category && (
                <span className="inline-block mt-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {e.newspaper.category.name}
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <section className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="font-semibold mb-4">Recommandés pour vous</h2>
          <div className="space-y-3">
            {recommended.map((a: any) => (
              <Link
                key={a.id}
                to="/lecteur/$editionId"
                params={{ editionId: a.edition.id }}
                className="flex gap-3 p-3 rounded-lg hover:bg-accent transition"
              >
                <NewspaperLogo
                  slug={a.edition.newspaper.slug}
                  name={a.edition.newspaper.name}
                  className="w-16 h-20 shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.edition.newspaper.name} • P.{a.page_number}
                  </p>
                  {a.edition.newspaper.category && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.edition.newspaper.category.name} •{" "}
                      {new Date(a.edition.edition_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h2 className="font-semibold mb-4">Vos statistiques</h2>
          <div className="space-y-4">
            <Stat icon={Eye} label="Journaux consultés (30 derniers jours)" value={stats?.downloads ?? 0} />
            <Stat icon={SearchIcon} label="Recherches effectuées" value={stats?.searches ?? 0} />
            <Stat icon={Bell} label="Alertes actives" value={stats?.alerts ?? 0} />
          </div>
          <Link to="/profil" className="block text-sm text-primary mt-4">
            Voir mon activité
          </Link>
        </section>
      </div>

      <NewsTicker />
    </div>
  );

}

function Stat({ icon: I, label, value }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-md bg-primary/10 text-primary grid place-items-center">
        <I className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-xl font-bold leading-none">{String(value).padStart(2, "0")}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}
