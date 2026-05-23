import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Lock, Save, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/profil")({
  head: () => ({ meta: [{ title: "Mon profil — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});

function Page() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ display_name: "", email: "", phone: "", department: "", language: "fr", timezone: "UTC+1 Yaoundé" });
  const [pwd, setPwd] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("user_id", user!.id).single()).data,
  });

  useEffect(() => {
    if (profile) setForm({
      display_name: profile.display_name ?? "",
      email: profile.email ?? user?.email ?? "",
      phone: profile.phone ?? "",
      department: profile.department ?? "",
      language: profile.language ?? "fr",
      timezone: profile.timezone ?? "UTC+1 Yaoundé",
    });
  }, [profile, user]);

  const save = async () => {
    await supabase.from("profiles").update(form).eq("user_id", user!.id);
    toast.success("Profil mis à jour");
  };
  const changePwd = async () => {
    if (pwd.length < 6) return toast.error("6 caractères minimum");
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) toast.error(error.message); else { toast.success("Mot de passe modifié"); setPwd(""); }
  };

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-6 max-w-4xl">
      <aside className="bg-card border border-border rounded-xl p-5 h-fit text-center">
        <div className="h-20 w-20 rounded-full bg-primary text-primary-foreground mx-auto grid place-items-center text-2xl font-bold">
          {(form.display_name || form.email || "U").slice(0, 1).toUpperCase()}
        </div>
        <h2 className="font-semibold mt-3">{form.display_name || "Utilisateur"}</h2>
        <p className="text-xs text-muted-foreground">{form.department || "Analyste"}</p>
        <button onClick={() => { signOut(); navigate({ to: "/login" }); }}
          className="mt-5 w-full h-10 rounded-md border border-border text-sm flex items-center justify-center gap-2 hover:bg-accent">
          <LogOut className="h-4 w-4" /> Se déconnecter
        </button>
      </aside>

      <div className="space-y-6">
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold">Mon profil</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nom complet" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} />
            <Field label="Email" value={form.email} disabled />
            <Field label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Département" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
            <Field label="Langue" value={form.language} onChange={(v) => setForm({ ...form, language: v })} />
            <Field label="Fuseau horaire" value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v })} />
          </div>
          <button onClick={save} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-2"><Save className="h-4 w-4" /> Modifier le profil</button>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Lock className="h-4 w-4" /> Sécurité</h2>
          <div className="flex items-end gap-3 max-w-md">
            <Field label="Nouveau mot de passe" value={pwd} onChange={setPwd} type="password" />
            <button onClick={changePwd} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm shrink-0">Changer</button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, type = "text" }: { label: string; value: string; onChange?: (v: string) => void; disabled?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input type={type} value={value} disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-background text-sm disabled:bg-muted/50" />
    </label>
  );
}
