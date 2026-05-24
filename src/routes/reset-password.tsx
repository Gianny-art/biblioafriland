import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import icon from "@/assets/afriland-icon.webp";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Réinitialiser le mot de passe" }] }),
  component: Reset,
});

function Reset() {
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) return toast.error("8 caractères minimum");
    if (pwd !== pwd2) return toast.error("Les mots de passe ne correspondent pas");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Mot de passe modifié"); navigate({ to: "/" }); }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-card border border-border rounded-xl p-8 space-y-4">
        <img src={icon} alt="" className="h-10 w-10 mx-auto" />
        <h1 className="text-xl font-bold text-center">Nouveau mot de passe</h1>
        <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required minLength={8}
          placeholder="Nouveau mot de passe" className="w-full h-11 px-3 rounded-md border border-border bg-background text-sm" />
        <input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} required minLength={8}
          placeholder="Confirmer" className="w-full h-11 px-3 rounded-md border border-border bg-background text-sm" />
        <button disabled={loading} className="w-full h-11 rounded-md bg-primary text-primary-foreground font-medium">
          {loading ? "..." : "Mettre à jour"}
        </button>
      </form>
    </div>
  );
}
