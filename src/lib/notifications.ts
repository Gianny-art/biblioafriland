import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useNotificationStream(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    const channel = supabase
      .channel(`notifs-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const n = payload.new;
          toast(n.title, { description: n.body });
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(`Bibliothèque Afriland — ${n.title}`, {
                body: n.body ?? "", icon: "/favicon.ico", tag: n.id,
              });
            } catch {}
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);
}
