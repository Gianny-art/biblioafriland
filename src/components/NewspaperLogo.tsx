const palette: Record<string, { bg: string; fg: string; label: string }> = {
  "cameroon-tribune": { bg: "#1d4ed8", fg: "#fff", label: "Cameroon Tribune" },
  "leconomiste-du-cameroun": { bg: "#dc2626", fg: "#fff", label: "L'Économiste" },
  "le-jour": { bg: "#0f172a", fg: "#fff", label: "Le Jour" },
  "mutations": { bg: "#b91c1c", fg: "#fff", label: "Mutations" },
  "financial-afrik": { bg: "#111827", fg: "#facc15", label: "Financial Afrik" },
  "investir-au-cameroun": { bg: "#15803d", fg: "#fff", label: "Investir au Cameroun" },
  "jeune-afrique": { bg: "#dc2626", fg: "#fff", label: "Jeune Afrique" },
  "the-guardian": { bg: "#1e3a8a", fg: "#fff", label: "The Guardian" },
  "forbes-afrique": { bg: "#000", fg: "#fff", label: "Forbes Afrique" },
  "le-monde": { bg: "#fff", fg: "#000", label: "Le Monde" },
};

export function NewspaperLogo({
  slug, name, className = "", coverUrl, badge,
}: {
  slug: string; name: string; className?: string; coverUrl?: string | null;
  badge?: "new" | "old" | null;
}) {
  const p = palette[slug] ?? { bg: "#dc2626", fg: "#fff", label: name };
  return (
    <div className={`relative afb-newspaper-cover rounded-md overflow-hidden ${className}`}>
      {coverUrl ? (
        <img src={coverUrl} alt={name} loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-bold text-center px-2"
          style={{ backgroundColor: p.bg, color: p.fg, fontFamily: "Georgia, serif" }}
        >
          <span className="text-xs sm:text-sm leading-tight">{p.label}</span>
        </div>
      )}
      {badge === "new" && (
        <span className="absolute top-1 left-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary text-primary-foreground shadow-sm">
          Nouveau
        </span>
      )}
      {badge === "old" && (
        <span className="absolute top-1 left-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground shadow-sm">
          Archive
        </span>
      )}
    </div>
  );
}

export function badgeFor(date?: string | null): "new" | "old" | null {
  if (!date) return null;
  const d = new Date(date).getTime();
  const days = (Date.now() - d) / (1000 * 60 * 60 * 24);
  if (days <= 7) return "new";
  if (days >= 60) return "old";
  return null;
}
