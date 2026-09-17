import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { EmptyState } from "@/components/empty-state";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Toegankelijkheid",
  description: "Toegankelijkheidsverklaring van het NL Overheid Graph.",
  alternates: canonical("/toegankelijkheid/"),
};

export default function AccessibilityPage() {
  return (
    <>
      <Breadcrumb
        items={[{ label: "NL Overheid Graph", href: "/" }, { label: "Toegankelijkheid" }]}
      />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Toegankelijkheid</h1>
      <div className="mt-4">
        <EmptyState
          title="Deze pagina wordt nog geschreven"
          description="Hier komen het nagestreefde niveau (WCAG 2.2 AA), de bekende beperkingen en een contactpunt voor meldingen te staan."
        />
      </div>
    </>
  );
}
