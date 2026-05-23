import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Settings, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { NewspaperLogo } from "@/components/NewspaperLogo";

export const Route = createFileRoute("/abonnements")({
  head: () => ({ meta: [{ title: "Abonnements — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});

function Page() {
  const { data: subs = [] } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => (await supabase.from("subscriptions")
      .select("id, plan, status, next_renewal, storage_used_bytes, newspaper:newspapers(id,name,slug,frequency)")).data ?? [],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Gestion des abonnements</h1>
        <button className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" /> Ajouter un abonnement
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {subs.map((s: any) => (
          <div key={s.id} className="p-4 flex items-center gap-4">
            <NewspaperLogo slug={s.newspaper.slug} name={s.newspaper.name} className="w-14 h-16 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{s.newspaper.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.plan}</p>
              <p className="text-xs text-muted-foreground">Prochain renouvellement : {s.next_renewal ? new Date(s.next_renewal).toLocaleDateString("fr-FR") : "—"}</p>
              <p className="text-xs text-muted-foreground">Statut : <span className="text-success font-medium">{s.status}</span></p>
            </div>
            <button className="h-9 px-3 rounded-md border border-border text-sm flex items-center gap-1 hover:bg-accent">
              <Settings className="h-3.5 w-3.5" /> Gérer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
