import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import logo from "@/assets/afriland-logo.webp";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — Bibliothèque numérique Afriland" }] }),
  component: Login,
});

function Login() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/" }); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, name || email.split("@")[0]);
    setLoading(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success(mode === "signin" ? "Connecté" : "Compte créé, vous êtes connecté");
      navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-[420px_1fr]">
      {/* Left: form */}
      <div className="flex flex-col p-8 md:p-10 bg-card">
        <img src={logo} alt="Afriland First Bank" className="h-11 self-start" />
        <div className="mt-12 flex-1 flex flex-col justify-center max-w-sm w-full">
          <h1 className="text-3xl font-bold tracking-tight">{mode === "signin" ? "Connexion" : "Créer un compte"}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === "signin"
              ? "Connectez-vous pour accéder à votre bibliothèque numérique."
              : "Créez un compte coéquipier pour accéder à la bibliothèque."}
          </p>
          <form onSubmit={submit} className="mt-8 space-y-3">
            {mode === "signup" && (
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Nom complet" className="input" />
            )}
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
              placeholder="Identifiant professionnel (email)" className="input" />
            <div className="relative">
              <input value={password} onChange={(e) => setPassword(e.target.value)}
                type={show ? "text" : "password"} required minLength={6}
                placeholder="Mot de passe" className="input pr-10" />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button disabled={loading}
              className="w-full h-11 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-sm text-muted-foreground mt-6 hover:text-primary">
            {mode === "signin" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
          </button>
          <p className="text-xs text-muted-foreground mt-10">
            Besoin d'aide ? <Link to="/" className="text-primary">Contactez le support</Link>
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-8">© 2026 Afriland First Bank. Tous droits réservés.</p>
      </div>

      {/* Right: hero */}
      <div className="hidden md:flex relative bg-[oklch(0.18_0.01_270)] text-white p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-25"
          style={{ backgroundImage: "linear-gradient(135deg, oklch(0.55 0.22 27) 0%, transparent 60%)" }} />
        <div className="relative z-10 flex flex-col justify-between w-full">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60">Afriland First Bank</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight">
              Bibliothèque<br />numérique<br />de la presse
            </h2>
            <p className="mt-6 text-white/70 max-w-md">
              Votre accès à l'information stratégique, partout, tout le temps.
            </p>
          </div>
          <div className="text-xs text-white/40">La Banque qui donne envie d'avancer.</div>
        </div>
      </div>

      <style>{`.input{width:100%;height:44px;padding:0 14px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-background);font-size:14px;outline:none}.input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-ring) 15%, transparent)}`}</style>
    </div>
  );
}
