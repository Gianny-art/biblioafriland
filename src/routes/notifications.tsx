import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifs = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Notifications</h1>
        <button onClick={markAll} className="text-sm text-primary flex items-center gap-1"><Check className="h-4 w-4" /> Tout marquer comme lu</button>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {notifs.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Aucune notification. Vous recevrez ici les alertes de nouvelles parutions et de mots-clés.
          </div>
        )}
        {notifs.map((n: any) => (
          <div key={n.id} className={`p-4 ${!n.read ? "bg-primary/5" : ""}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-1 h-2 w-2 rounded-full ${!n.read ? "bg-primary" : "bg-transparent"}`} />
              <div className="flex-1">
                <p className="font-medium text-sm">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
              </div>
              <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
