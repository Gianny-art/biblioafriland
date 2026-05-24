import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bell, Home, Newspaper, Tags, Search, Heart, User, LayoutDashboard, BookOpen, CreditCard, FileText, LogOut, Menu, X, Sun, Moon, Languages, Scale } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useT } from "@/lib/i18n";
import { useNotificationStream } from "@/lib/notifications";
import icon from "@/assets/afriland-icon.webp";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MotifBand } from "@/components/Motif";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { lang, setLang, t } = useT();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useNotificationStream(user?.id);

  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false).eq("user_id", user.id)
      .then(({ count }) => setUnread(count ?? 0));
  }, [user, path]);

  if (!user) {
    if (typeof window !== "undefined" && path !== "/login" && !path.startsWith("/reset-password")) navigate({ to: "/login" });
    return null;
  }

  const mainNav = [
    { to: "/", label: t("home"), icon: Home },
    { to: "/journaux", label: t("newspapers"), icon: Newspaper },
    { to: "/categories", label: t("categories"), icon: Tags },
    { to: "/reglementations", label: t("regulations"), icon: Scale },
    { to: "/recherche", label: t("search"), icon: Search },
  ];

  // Mobile bottom nav (5 items)
  const mobileNav = [
    { to: "/", label: t("home"), icon: Home },
    { to: "/journaux", label: t("newspapers"), icon: Newspaper },
    { to: "/reglementations", label: t("regulations"), icon: Scale },
    { to: "/favoris", label: t("favorites"), icon: Heart },
    { to: "/profil", label: t("profile"), icon: User },
  ];

  // Hamburger items: exclude what is in bottom nav
  const hamburgerExtras = [
    { to: "/recherche", label: t("search"), icon: Search },
    { to: "/categories", label: t("categories"), icon: Tags },
    { to: "/abonnements", label: t("subscriptions"), icon: CreditCard },
    { to: "/documents", label: t("documents"), icon: FileText },
    { to: "/notifications", label: t("notifications"), icon: Bell },
    ...(role === "admin" ? [{ to: "/administration", label: t("administration"), icon: LayoutDashboard }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={icon} alt="Afriland First Bank" className="h-9 w-9 object-contain" />
            <span className="hidden sm:flex flex-col leading-none">
              <span className="font-bold text-sm">Afriland First Bank</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">Bibliothèque numérique</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {mainNav.map((n) => {
              const active = path === n.to || (n.to !== "/" && path.startsWith(n.to));
              return (
                <Link key={n.to} to={n.to}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition ${active ? "text-primary border-b-2 border-primary rounded-none" : "text-foreground/70 hover:text-foreground hover:bg-accent"}`}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden lg:flex flex-1 max-w-md ml-4">
            <SearchBar />
          </div>
          <div className="flex-1 lg:hidden" />

          <button onClick={toggle} title={t("theme")} className="hidden md:grid p-2 rounded-md hover:bg-accent place-items-center">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button onClick={() => setLang(lang === "fr" ? "en" : "fr")} title={t("lang")}
            className="hidden md:flex items-center gap-1 px-2 py-2 rounded-md hover:bg-accent text-xs font-medium uppercase">
            <Languages className="h-4 w-4" /> {lang}
          </button>

          <Link to="/notifications" className="relative p-2 rounded-md hover:bg-accent">
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />}
          </Link>
          <Link to="/profil" className="hidden md:grid p-2 rounded-md hover:bg-accent place-items-center" title={t("profile")}>
            <User className="h-5 w-5" />
          </Link>
          {role === "admin" && (
            <Link to="/administration" className="hidden md:grid p-2 rounded-md hover:bg-accent place-items-center" title="Admin">
              <LayoutDashboard className="h-5 w-5" />
            </Link>
          )}
          <button onClick={() => { signOut(); navigate({ to: "/login" }); }} className="hidden md:grid p-2 rounded-md hover:bg-accent place-items-center" title={t("logout")}>
            <LogOut className="h-5 w-5" />
          </button>
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="menu">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <MotifBand />
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-card p-2 space-y-1">
            {hamburgerExtras.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent">
                <n.icon className="h-4 w-4" />{n.label}
              </Link>
            ))}
            <div className="border-t border-border my-2" />
            <button onClick={() => { toggle(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? t("light") : t("dark")}
            </button>
            <button onClick={() => setLang(lang === "fr" ? "en" : "fr")} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent">
              <Languages className="h-4 w-4" />{lang === "fr" ? "English" : "Français"}
            </button>
            <button onClick={() => { signOut(); navigate({ to: "/login" }); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-primary hover:bg-accent">
              <LogOut className="h-4 w-4" />{t("logout")}
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 pb-24 md:pb-8 relative">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border safe-bottom">
        <div className="grid grid-cols-5">
          {mobileNav.map((n) => {
            const active = path === n.to || (n.to !== "/" && path.startsWith(n.to));
            return (
              <Link key={n.to} to={n.to}
                className={`flex flex-col items-center justify-center py-2.5 text-[11px] gap-0.5 ${active ? "text-primary" : "text-muted-foreground"}`}>
                <n.icon className="h-5 w-5" />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function SearchBar() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { t } = useT();
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate({ to: "/recherche", search: { q } as any }); }}
      className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={t("searchPh")}
        className="w-full h-10 pl-9 pr-3 rounded-md bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </form>
  );
}
