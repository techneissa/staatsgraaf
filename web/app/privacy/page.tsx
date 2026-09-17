import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { EmptyState } from "@/components/empty-state";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacyverklaring van het NL Overheid Graph.",
  alternates: canonical("/privacy/"),
};

export default function PrivacyPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "NL Overheid Graph", href: "/" }, { label: "Privacy" }]} />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Privacy</h1>
      <div className="mt-4">
        <EmptyState
          title="Deze pagina wordt nog geschreven"
          description="Hier komt te staan welke gegevens worden verwerkt, op welke grondslag, en hoe correctie of verwijdering kan worden gevraagd."
        />
      </div>
    </>
  );
}
