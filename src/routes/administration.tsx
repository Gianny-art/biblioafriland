import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Newspaper, Tags, Users, CreditCard, Bell, Settings, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/administration")({
  head: () => ({ meta: [{ title: "Administration — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});

function Page() {
  const { role } = useAuth();
  if (role !== "admin") {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-bold">Accès restreint</h1>
        <p className="text-muted-foreground text-sm mt-2">Cette section est réservée aux administrateurs.</p>
        <Link to="/" className="inline-block mt-4 text-primary text-sm">Retour à l'accueil</Link>
      </div>
    );
  }

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [n, c, e, a] = await Promise.all([
        supabase.from("newspapers").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("editions").select("id", { count: "exact", head: true }),
        supabase.from("articles").select("id", { count: "exact", head: true }),
      ]);
      return { newspapers: n.count ?? 0, categories: c.count ?? 0, editions: e.count ?? 0, articles: a.count ?? 0 };
    },
  });

  const { data: recentEditions = [] } = useQuery({
    queryKey: ["admin-recent-editions"],
    queryFn: async () => (await supabase.from("editions")
      .select("id, edition_date, page_count, newspaper:newspapers(name,slug)")
      .order("created_at", { ascending: false }).limit(5)).data ?? [],
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => (await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(8)).data ?? [],
  });

  return (
    <div className="grid lg:grid-cols-[240px_1fr] gap-6">
      <aside className="bg-card border border-border rounded-xl p-3 h-fit">
        {[
          { icon: LayoutDashboard, label: "Tableau de bord" },
          { icon: Newspaper, label: "Journaux" },
          { icon: Tags, label: "Catégories" },
          { icon: Users, label: "Utilisateurs" },
          { icon: CreditCard, label: "Abonnements" },
          { icon: Bell, label: "Alertes" },
          { icon: Settings, label: "Paramètres" },
          { icon: FileText, label: "Journal d'activité" },
        ].map((it, i) => (
          <button key={i} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${i === 0 ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
            <it.icon className="h-4 w-4" /> {it.label}
          </button>
        ))}
      </aside>

      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Tableau de bord</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI label="Journaux abonnés" value={stats?.newspapers ?? 0} />
          <KPI label="Parutions ce mois" value={stats?.editions ?? 0} />
          <KPI label="Articles indexés" value={stats?.articles ?? 0} />
          <KPI label="Catégories" value={stats?.categories ?? 0} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold mb-3">Parutions récentes</h2>
            <div className="space-y-2 text-sm">
              {recentEditions.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between py-1">
                  <span>{e.newspaper.name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(e.edition_date).toLocaleDateString("fr-FR")} • {e.page_count} pages</span>
                </div>
              ))}
              {recentEditions.length === 0 && <p className="text-muted-foreground text-sm">Aucune parution.</p>}
            </div>
          </section>

          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold mb-3">Activité récente</h2>
            <div className="space-y-2 text-sm">
              {activity.map((a: any) => (
                <div key={a.id} className="text-xs">
                  <span className="font-medium">{a.user_display ?? "Système"}</span>
                  <span className="text-muted-foreground"> — {a.action}</span>
                  <span className="text-muted-foreground"> • {new Date(a.created_at).toLocaleString("fr-FR")}</span>
                </div>
              ))}
              {activity.length === 0 && <p className="text-muted-foreground text-sm">Aucune activité enregistrée.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
