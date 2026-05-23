import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, Home, Newspaper, Tags, Search, Heart, User, LayoutDashboard, BookOpen, CreditCard, FileText, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import logo from "@/assets/afriland-logo.webp";
import icon from "@/assets/afriland-icon.webp";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const mainNav = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/journaux", label: "Journaux", icon: Newspaper },
  { to: "/categories", label: "Catégories", icon: Tags },
  { to: "/recherche", label: "Recherche avancée", icon: Search },
];

const mobileNav = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/journaux", label: "Journaux", icon: Newspaper },
  { to: "/recherche", label: "Rechercher", icon: Search },
  { to: "/favoris", label: "Favoris", icon: Heart },
  { to: "/profil", label: "Profil", icon: User },
];

export default function AppLayout() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false)
      .then(({ count }) => setUnread(count ?? 0));
  }, [user, path]);

  if (!user) {
    if (typeof window !== "undefined" && path !== "/login") navigate({ to: "/login" });
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Afriland First Bank" className="h-9 hidden sm:block" />
            <img src={icon} alt="Afriland" className="h-9 sm:hidden" />
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
          <div className="hidden md:flex flex-1 max-w-md ml-4">
            <SearchBar />
          </div>
          <div className="flex-1 md:hidden" />
          <Link to="/notifications" className="relative p-2 rounded-md hover:bg-accent">
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />}
          </Link>
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-card p-2 space-y-1">
            {[...mainNav,
              { to: "/bibliotheque", label: "Bibliothèque", icon: BookOpen },
              { to: "/favoris", label: "Mes favoris", icon: Heart },
              { to: "/abonnements", label: "Abonnements", icon: CreditCard },
              { to: "/documents", label: "Documents", icon: FileText },
              ...(role === "admin" ? [{ to: "/administration", label: "Administration", icon: LayoutDashboard }] : []),
              { to: "/profil", label: "Mon profil", icon: User },
            ].map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent">
                <n.icon className="h-4 w-4" />{n.label}
              </Link>
            ))}
            <button onClick={() => { signOut(); navigate({ to: "/login" }); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-primary hover:bg-accent">
              <LogOut className="h-4 w-4" />Se déconnecter
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border">
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
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate({ to: "/recherche", search: { q } as any }); }}
      className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un journal, un article, un mot-clé..."
        className="w-full h-10 pl-9 pr-3 rounded-md bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </form>
  );
}
