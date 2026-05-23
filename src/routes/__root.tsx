import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bibliothèque numérique de la presse — Afriland First Bank" },
      { name: "description", content: "Plateforme interne d'accès à la presse numérique d'Afriland First Bank." },
      { property: "og:title", content: "Bibliothèque numérique de la presse — Afriland First Bank" },
      { name: "twitter:title", content: "Bibliothèque numérique de la presse — Afriland First Bank" },
      { property: "og:description", content: "Plateforme interne d'accès à la presse numérique d'Afriland First Bank." },
      { name: "twitter:description", content: "Plateforme interne d'accès à la presse numérique d'Afriland First Bank." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/cpFBJeoHUwNJMEFNOfOUHkRdGkz1/social-images/social-1779547945919-OIP_(1).webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/cpFBJeoHUwNJMEFNOfOUHkRdGkz1/social-images/social-1779547945919-OIP_(1).webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
