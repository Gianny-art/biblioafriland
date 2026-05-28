import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { LogOut, Camera, ShieldCheck, Mail, Activity, Eye, Search as SearchIcon, Star, Bell, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";

import { toast } from "sonner";

export const Route = createFileRoute("/profil")({
  head: () => ({ meta: [{ title: "Mon profil — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});


function Page() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);


  const { data: profile, refetch } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: activity } = useQuery({
    queryKey: ["my-activity", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [dls, srch, fav, alr, recent] = await Promise.all([
        supabase.from("downloads").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("search_history").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("alerts").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("active", true),
        supabase.from("downloads")
          .select("downloaded_at, edition:editions(id, edition_date, title, newspaper:newspapers(name,slug))")
          .eq("user_id", user!.id)
          .order("downloaded_at", { ascending: false })
          .limit(8),
      ]);
      return {
        downloads: dls.count ?? 0,
        searches: srch.count ?? 0,
        favorites: fav.count ?? 0,
        alerts: alr.count ?? 0,
        recent: recent.data ?? [],
      };
    },

  });

  useEffect(() => {}, []);

  const uploadAvatar = async (file: File) => {
    if (!user) return toast.error("Non connecté");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) return toast.error(upErr.message);
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    // Upsert défensif : crée le profil s'il n'existe pas (trigger handle_new_user peut avoir manqué)
    const { error: pErr } = await supabase.from("profiles").upsert(
      { user_id: user.id, email: user.email, avatar_url: url },
      { onConflict: "user_id" }
    );
    if (pErr) return toast.error(pErr.message);
    toast.success("Photo de profil mise à jour");
    refetch();
  };




  const initials = (profile?.display_name || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-8 max-w-6xl mx-auto relative">
      <aside className="relative bg-card border border-border rounded-2xl p-8 h-fit text-center shadow-sm">

        <div className="relative h-24 w-24 mx-auto">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-primary text-primary-foreground grid place-items-center text-2xl font-bold">
              {initials}
            </div>
          )}
          <button onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-card border border-border grid place-items-center shadow-sm hover:bg-accent">
            <Camera className="h-4 w-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
        </div>
        <h2 className="font-semibold mt-4">{profile?.display_name ?? "Utilisateur"}</h2>
        <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Mail className="h-3 w-3" />{user?.email}</p>
        <button onClick={() => { signOut(); navigate({ to: "/login" }); }}
          className="mt-6 w-full h-10 rounded-md border border-border text-sm flex items-center justify-center gap-2 hover:bg-accent">
          <LogOut className="h-4 w-4" /> Se déconnecter
        </button>
      </aside>

      <div className="relative space-y-6">
        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Compte</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
            <Field label="Nom" value={profile?.display_name ?? "—"} />
            <Field label="Email" value={user?.email ?? "—"} />
            <Field label="Membre depuis" value={user?.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—"} />
            <Field label="Dernière connexion" value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("fr-FR") : "—"} />
          </div>
          <p className="text-xs text-muted-foreground mt-4">Ces informations sont automatiquement synchronisées depuis votre identité d'entreprise.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Lock className="h-5 w-5" /> Mot de passe — Validation en 2 étapes</h2>
          <p className="text-xs text-muted-foreground">Pour modifier votre mot de passe, nous envoyons d'abord un code à 6 chiffres sur votre email professionnel.</p>

          {step === "idle" && (
            <button onClick={() => { setStep("request"); requestOtp(); }} disabled={busy}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-60">
              {busy ? "Envoi…" : "Envoyer le code de vérification"}
            </button>
          )}
          {step === "verify" && (
            <div className="space-y-3 max-w-md">
              <label className="block text-xs">
                <span className="text-muted-foreground">Code reçu par email</span>
                <input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6}
                  className="mt-1 w-full h-11 px-3 rounded-md border border-border bg-background tracking-[0.5em] text-center font-mono" />
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground">Nouveau mot de passe (8+ caractères)</span>
                <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                  className="mt-1 w-full h-11 px-3 rounded-md border border-border bg-background" />
              </label>
              <div className="flex gap-2">
                <button disabled={busy} onClick={verifyAndChange} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-60">
                  {busy ? "…" : "Vérifier et changer"}
                </button>
                <button onClick={() => { setStep("idle"); setOtp(""); setNewPwd(""); }} className="h-10 px-4 rounded-md border border-border text-sm">Annuler</button>
              </div>
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Mon activité</h2>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ActivityStat icon={Eye} label="Lectures" value={activity?.downloads ?? 0} />
            <ActivityStat icon={SearchIcon} label="Recherches" value={activity?.searches ?? 0} />
            <ActivityStat icon={Star} label="Favoris" value={activity?.favorites ?? 0} />
            <ActivityStat icon={Bell} label="Alertes actives" value={activity?.alerts ?? 0} />
          </div>
          <div className="mt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Dernières lectures</p>
            {activity && activity.recent.length > 0 ? (
              <ul className="divide-y divide-border border border-border rounded-md">
                {activity.recent.map((r: any, i: number) => (
                  <li key={i} className="p-3 flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.edition?.newspaper?.name ?? "Journal"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.edition?.title ?? `Édition du ${r.edition?.edition_date ?? ""}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.downloaded_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </span>
                      {r.edition?.id && (
                        <Link to="/lecteur/$editionId" params={{ editionId: r.edition.id }} className="text-xs text-primary">
                          Rouvrir
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">Aucune lecture pour l'instant. Ouvrez un journal depuis la bibliothèque.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ActivityStat({ icon: I, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-background/50">
      <div className="flex items-center gap-2 text-muted-foreground"><I className="h-3.5 w-3.5" /><span className="text-[10px] uppercase tracking-wide">{label}</span></div>
      <p className="text-2xl font-bold mt-1">{String(value).padStart(2, "0")}</p>
    </div>
  );
}


function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium mt-1">{value}</p>
    </div>
  );
}
