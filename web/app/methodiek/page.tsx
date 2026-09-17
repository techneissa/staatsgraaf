import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { EmptyState } from "@/components/empty-state";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Methodiek",
  description:
    "Hoe de dataset van het NL Overheid Graph tot stand komt: bronnen, controle, en het gebruik van taalmodellen.",
  alternates: canonical("/methodiek/"),
};

export default function MethodPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "NL Overheid Graph", href: "/" }, { label: "Methodiek" }]} />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Methodiek</h1>
      <div className="mt-4">
        <EmptyState
          title="Deze pagina wordt nog geschreven"
          description="Hier komen de bronverantwoording, de controlemethode en de AI-disclosure te staan."
        />
      </div>
    </>
  );
}
