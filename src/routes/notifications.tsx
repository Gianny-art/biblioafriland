import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Trash2, CheckCheck, Scale, Newspaper, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});

function iconFor(type: string) {
  if (type === "regulation") return Scale;
  if (type === "edition") return Newspaper;
  return Info;
}

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: notifs = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });

  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
    refresh();
    toast.success("Toutes les notifications marquées comme lues");
  };

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    refresh();
  };

  const removeOne = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    refresh();
  };

  const clearAll = async () => {
    if (!confirm("Supprimer toutes les notifications ?")) return;
    await supabase.from("notifications").delete().eq("user_id", user!.id);
    refresh();
    toast.success("Notifications supprimées");
  };

  const open = async (n: any) => {
    if (!n.read) await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    refresh();
    if (n.link) navigate({ to: n.link });
  };

  const unreadCount = notifs.filter((n: any) => !n.read).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" /> Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est à jour"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={markAll} disabled={unreadCount === 0}
            className="h-9 px-3 rounded-md border border-border text-xs flex items-center gap-1.5 hover:bg-accent disabled:opacity-40">
            <CheckCheck className="h-4 w-4" /> Tout marquer lu
          </button>
          <button onClick={clearAll} disabled={notifs.length === 0}
            className="h-9 px-3 rounded-md border border-destructive/30 text-destructive text-xs flex items-center gap-1.5 hover:bg-destructive/10 disabled:opacity-40">
            <Trash2 className="h-4 w-4" /> Vider
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
        {notifs.length === 0 && (
          <div className="p-12 text-center text-muted-foreground text-sm">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            Aucune notification pour le moment.
          </div>
        )}
        {notifs.map((n: any) => {
          const Icon = iconFor(n.type);
          return (
            <div key={n.id} className={`group flex items-start gap-3 p-4 transition ${!n.read ? "bg-primary/[0.04]" : ""}`}>
              <button onClick={() => open(n)} className="flex-1 flex items-start gap-3 text-left">
                <div className={`h-9 w-9 rounded-full grid place-items-center shrink-0 ${!n.read ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {new Date(n.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {n.link && <span className="ml-2 text-primary">· Cliquer pour ouvrir</span>}
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                {!n.read && (
                  <button onClick={() => markOne(n.id)} title="Marquer comme lu" className="p-2 rounded-md hover:bg-accent">
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => removeOne(n.id)} title="Supprimer" className="p-2 rounded-md hover:bg-destructive/10 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
