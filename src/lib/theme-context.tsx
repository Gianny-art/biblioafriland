import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const Ctx = createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: "light", toggle: () => {}, setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem("afb-theme")) as Theme | null;
    const initial = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("afb-theme", theme); } catch {}
  }, [theme]);

  return (
    <Ctx.Provider value={{ theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") }}>
      {children}
    </Ctx.Provider>
  );
}
export const useTheme = () => useContext(Ctx);
