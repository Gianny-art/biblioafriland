import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "fr" | "en";
const dict = {
  fr: {
    home: "Accueil", newspapers: "Journaux", categories: "Catégories", search: "Recherche avancée",
    favorites: "Favoris", subscriptions: "Abonnements", documents: "Documents",
    administration: "Administration", profile: "Mon profil", logout: "Se déconnecter",
    regulations: "Règlementations", notifications: "Notifications",
    library: "Bibliothèque", archives: "Archives", recent: "Parutions récentes",
    downloads: "Mes téléchargements", filter: "Filtrer", allNewspapers: "Tous les journaux",
    allCategories: "Toutes les catégories", noEditions: "Aucune parution.",
    today: "À la une aujourd'hui", seeAll: "Voir tout",
    hello: "Bonjour", greetSub: "Voici les dernières parutions disponibles",
    recommended: "Recommandés pour vous", stats: "Vos statistiques",
    consulted: "Journaux consultés (30 derniers jours)",
    searches: "Recherches effectuées", activeAlerts: "Alertes actives",
    seeActivity: "Voir mon activité",
    searchPh: "Rechercher un journal, un article, un mot-clé...",
    signIn: "Se connecter", signUp: "Créer mon compte",
    welcome: "Bienvenue", loginSub: "Connectez-vous à votre bibliothèque numérique.",
    createAccount: "Créer un compte", noAccount: "Pas encore de compte ? Créer un compte",
    hasAccount: "Déjà un compte ? Se connecter",
    email: "Email professionnel", password: "Mot de passe",
    forgotPassword: "Mot de passe oublié ?",
    or: "OU PAR EMAIL",
    continueGoogle: "Continuer avec Google", continueApple: "Continuer avec Apple",
    fullName: "Nom complet",
    theme: "Thème", lang: "Langue", light: "Clair", dark: "Sombre",
    fullscreen: "Plein écran", exitFullscreen: "Quitter plein écran",
    newBadge: "Nouveau", oldBadge: "Archive",
  },
  en: {
    home: "Home", newspapers: "Newspapers", categories: "Categories", search: "Advanced search",
    favorites: "Favorites", subscriptions: "Subscriptions", documents: "Documents",
    administration: "Administration", profile: "My profile", logout: "Sign out",
    regulations: "Regulations", notifications: "Notifications",
    library: "Library", archives: "Archives", recent: "Recent issues",
    downloads: "My downloads", filter: "Filter", allNewspapers: "All newspapers",
    allCategories: "All categories", noEditions: "No issue.",
    today: "Today's headlines", seeAll: "See all",
    hello: "Hello", greetSub: "Latest issues available",
    recommended: "Recommended for you", stats: "Your stats",
    consulted: "Newspapers viewed (last 30 days)",
    searches: "Searches", activeAlerts: "Active alerts",
    seeActivity: "View activity",
    searchPh: "Search a paper, an article, a keyword...",
    signIn: "Sign in", signUp: "Create my account",
    welcome: "Welcome", loginSub: "Sign in to your digital library.",
    createAccount: "Create account", noAccount: "No account yet? Sign up",
    hasAccount: "Already have an account? Sign in",
    email: "Work email", password: "Password",
    forgotPassword: "Forgot password?",
    or: "OR WITH EMAIL",
    continueGoogle: "Continue with Google", continueApple: "Continue with Apple",
    fullName: "Full name",
    theme: "Theme", lang: "Language", light: "Light", dark: "Dark",
    fullscreen: "Fullscreen", exitFullscreen: "Exit fullscreen",
    newBadge: "New", oldBadge: "Archive",
  },
} as const;
type Key = keyof typeof dict.fr;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "fr", setLang: () => {}, t: (k) => dict.fr[k],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("fr");
  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem("afb-lang")) as Lang | null;
    if (saved === "en" || saved === "fr") setLang(saved);
  }, []);
  useEffect(() => {
    try { localStorage.setItem("afb-lang", lang); } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);
  return <Ctx.Provider value={{ lang, setLang, t: (k) => dict[lang][k] }}>{children}</Ctx.Provider>;
}
export const useT = () => useContext(Ctx);
