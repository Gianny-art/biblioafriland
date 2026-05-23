import { createFileRoute } from "@tanstack/react-router";
import { FileText, Download } from "lucide-react";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [{ title: "Documents techniques — Bibliothèque numérique" }] }),
  component: () => <AppLayout><Page /></AppLayout>,
});

const docs = [
  { name: "Cahier des charges — Bibliothèque numérique de la presse", file: "/documents/cahier-des-charges.docx", ref: "AFB_DI_PR02_MEMO_V1.0_2026" },
  { name: "Projet de réception numérique de la presse", file: "/documents/projet-reception-numerique.docx", ref: "AFB_COM_PR02_NOTE_V1.0_2026" },
];

function Page() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Documents du projet</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Référentiels techniques et organisationnels du projet bibliothèque numérique de la presse — Afriland First Bank, Département Communication & RSE.
        </p>
      </div>

      <div className="space-y-3">
        {docs.map((d) => (
          <a key={d.file} href={d.file} download
            className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:shadow-elegant transition">
            <div className="h-12 w-12 rounded-md bg-primary/10 text-primary grid place-items-center">
              <FileText className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{d.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Réf. {d.ref} • Format DOCX</p>
            </div>
            <Download className="h-5 w-5 text-muted-foreground" />
          </a>
        ))}
      </div>

      <section className="bg-card border border-border rounded-xl p-6 space-y-3 text-sm">
        <h2 className="font-semibold">À propos du projet</h2>
        <p className="text-muted-foreground">
          Ce projet vise à doter Afriland First Bank d'une plateforme interne de bibliothèque numérique permettant la
          réception, l'archivage, l'indexation et la consultation des journaux numériques issus des éditeurs partenaires.
          Les enjeux clés : <strong>réduction de 50 % du coût unitaire</strong>, accès aux contenus la veille au soir,
          constitution d'un fonds documentaire exploitable, et modernisation de la gestion documentaire.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Maîtrise d'ouvrage : Département Communication & RSE</li>
          <li>Maîtrise d'œuvre : Direction des Systèmes d'Information</li>
          <li>Disponibilité cible : ≥ 99,5 % en heures ouvrées</li>
          <li>Capacité : 1 000 utilisateurs simultanés</li>
          <li>Archivage : minimum 10 ans</li>
        </ul>
      </section>
    </div>
  );
}
