import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { EnglishOnly, T } from "@/components/i18n/t";
import { OrganizationsIndexView } from "@/components/index-list/organizations-index-view";
import { preload } from "react-dom";
import { getDatasetDate } from "@/lib/data";
import { buildOrganizationRows } from "@/lib/index-rows";
import { INDEX_FIRST_SCREEN, indexListUrl } from "@/lib/index-lists";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Organisaties",
  description:
    "Alle organisaties in de dataset, gegroepeerd naar staatsmacht, met per organisatie het type en een bron voor de instelling.",
  path: "/organisaties/",
  snapshotDate: getDatasetDate(),
});

/**
 * The organisations index. The page carries the first screen of cards; the
 * whole list is one JSON file (/peek/lists/organisaties.json) that the view
 * fetches at once, searches and windows on the client.
 */
export default function OrganizationsIndexPage() {
  const { rows, groups, total } = buildOrganizationRows();
  preload(indexListUrl("organisaties"), { as: "fetch", crossOrigin: "anonymous" });
  const pageUrl = absoluteUrl("/organisaties/");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Organisaties · ${SITE_NAME}`,
          description: "Organisaties van de Nederlandse staat, gegroepeerd naar staatsmacht.",
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: <T area="entity" k="orgIndexTitle" /> }]} />

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          <T area="entity" k="orgIndexTitle" />
        </h1>
        <EnglishOnly>
          <p className="mt-2 text-xs text-ink-faint">
            <T area="entity" k="descriptionsTranslatedNote" />
          </p>
        </EnglishOnly>
      </header>

      <OrganizationsIndexView initial={rows.slice(0, INDEX_FIRST_SCREEN.organisaties)} groups={groups} total={total} />
    </>
  );
}
