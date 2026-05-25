import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import icon from "@/assets/afriland-icon.webp";
import building from "@/assets/login-building.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — Bibliothèque numérique Afriland" }] }),
  component: Login,
});

function Login() {
  const { user, signIn, signUp } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res =
      mode === "signin" ? await signIn(email, password) : await signUp(email, password, name || email.split("@")[0]);
    setLoading(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success(mode === "signin" ? "Connecté" : "Compte créé");
      navigate({ to: "/" });
    }
  };

  const oauth = async (provider: "google" | "apple") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error(`${provider}: ${error.message}`);
  };

  const forgot = async () => {
    if (!email) return toast.error("Saisissez votre email");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Email de réinitialisation envoyé");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left: building hero */}
      <div className="hidden lg:flex relative overflow-hidden text-white">
        <img src={building} alt="" className="absolute inset-0 w-full h-full object-cover" width={1024} height={1280} />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, oklch(0.18 0.01 270 / .85), oklch(0.35 0.18 27 / .55))" }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <img src={icon} alt="" className="h-10 w-10 rounded-md bg-white p-1" />
            <div>
              <p className="font-bold leading-tight">Afriland First Bank</p>
              <p className="text-[11px] uppercase tracking-widest text-white/70">Bibliothèque numérique</p>
            </div>
          </div>
          <div>
            <h2 className="text-5xl font-bold leading-tight">
              La presse qui
              <br />
              fait avancer
              <br />
              <span className="text-primary-foreground/90">la Banque.</span>
            </h2>
            <p className="mt-6 text-white/80 max-w-md">
              Accédez à toute la presse économique et financière, suivez en direct les règlementations COBAC et CEMAC,
              recevez les alertes stratégiques.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              <Stat n="50+" l="Journaux" />
              <Stat n="24/7" l="Disponibilité" />
              <Stat n="100%" l="Sécurisé" />
            </div>
          </div>
          <div className="text-xs text-white/60">© 2026 Afriland First Bank · Confidentiel — Usage interne</div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex flex-col p-6 sm:p-10 bg-card">
        <div className="lg:hidden flex items-center gap-2 mb-6">
          <img src={icon} alt="" className="h-9 w-9" />
          <span className="font-bold">Afriland First Bank</span>
        </div>
        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
          <h1 className="text-3xl font-bold tracking-tight">{t("welcome")}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t("loginSub")}</p>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => oauth("google")}
              className="w-full h-11 rounded-md border border-border bg-background hover:bg-accent flex items-center justify-center gap-2 text-sm font-medium"
            >
              <GoogleIcon /> {t("continueGoogle")}
            </button>
            <button
              onClick={() => oauth("apple")}
              className="w-full h-11 rounded-md border border-border bg-background hover:bg-accent flex items-center justify-center gap-2 text-sm font-medium"
            >
              <AppleIcon /> {t("continueApple")}
            </button>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] tracking-widest text-muted-foreground">{t("or")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-md mb-4">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`h-9 rounded text-sm font-medium ${mode === m ? "bg-card shadow" : ""}`}
              >
                {m === "signin" ? "Connexion" : "Créer un compte"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <label className="block">
                <span className="text-xs text-muted-foreground">{t("fullName")}</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input mt-1"
                  placeholder="ex. Jean Dupont"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs text-muted-foreground">{t("email")}</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="input mt-1"
                placeholder="prenom.nom@afrilandfirstbank.com"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">{t("password")}</span>
              <div className="relative mt-1">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={show ? "text" : "password"}
                  required
                  minLength={6}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            {mode === "signin" && (
              <button type="button" onClick={forgot} className="text-xs text-primary hover:underline">
                {t("forgotPassword")}
              </button>
            )}
            <button
              disabled={loading}
              className="w-full h-11 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? t("signIn") : t("signUp")}
            </button>
          </form>

          <p className="text-xs text-muted-foreground mt-8 text-center">
            Besoin d'aide ?{" "}
            <Link to="/" className="text-primary">
              Contactez le support
            </Link>
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground mt-6 text-center">
          © 2026 Afriland First Bank. Tous droits réservés.
        </p>
      </div>

      <style>{`.input{width:100%;height:44px;padding:0 14px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-background);font-size:14px;outline:none;color:var(--color-foreground)}.input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-ring) 15%, transparent)}`}</style>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <p className="text-2xl font-bold">{n}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/60 mt-1">{l}</p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C40.9 36.4 44 30.7 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 12.04c-.03-2.7 2.2-4 2.3-4.06-1.26-1.84-3.22-2.09-3.92-2.12-1.67-.17-3.26.98-4.11.98-.85 0-2.16-.96-3.55-.93-1.83.03-3.51 1.06-4.45 2.7-1.9 3.29-.49 8.16 1.36 10.84.9 1.31 1.98 2.78 3.39 2.73 1.36-.05 1.88-.88 3.53-.88 1.64 0 2.11.88 3.55.85 1.47-.02 2.4-1.33 3.3-2.65 1.04-1.52 1.47-2.99 1.49-3.07-.03-.01-2.85-1.09-2.89-4.39zM14.4 4.13c.75-.91 1.26-2.17 1.12-3.43-1.08.05-2.39.72-3.16 1.63-.7.81-1.31 2.09-1.15 3.32 1.2.09 2.43-.61 3.19-1.52z" />
    </svg>
  );
}
