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

export function NewspaperLogo({ slug, name, className = "" }: { slug: string; name: string; className?: string }) {
  const p = palette[slug] ?? { bg: "#dc2626", fg: "#fff", label: name };
  return (
    <div
      className={`afb-newspaper-cover rounded-md flex items-center justify-center font-bold text-center px-2 ${className}`}
      style={{ backgroundColor: p.bg, color: p.fg, fontFamily: "Georgia, serif" }}
    >
      <span className="text-xs sm:text-sm leading-tight">{p.label}</span>
    </div>
  );
}
