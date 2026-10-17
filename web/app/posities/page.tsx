import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { T } from "@/components/i18n/t";
import { PositionsIndexView } from "@/components/index-list/positions-index-view";
import { LocalCount } from "@/components/content/local-date";
import { preload } from "react-dom";
import { getDatasetDate } from "@/lib/data";
import { buildPositionRows } from "@/lib/index-rows";
import { INDEX_FIRST_SCREEN, indexListUrl } from "@/lib/index-lists";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Posities",
  description:
    "Alle posities in de dataset, te sorteren op titel, orgaan of houder, met de organisatie waar de positie toe hoort en een bron per wettelijke basis.",
  path: "/posities/",
  snapshotDate: getDatasetDate(),
});

/**
 * The positions index. The page carries the first screen of rows; the whole
 * list is one JSON file (/peek/lists/posities.json) that the view fetches at
 * once, searches, sorts and windows on the client.
 */
export default function PositionsIndexPage() {
  const { rows, groups, total } = buildPositionRows();
  preload(indexListUrl("posities"), { as: "fetch", crossOrigin: "anonymous" });
  const pageUrl = absoluteUrl("/posities/");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Posities · ${SITE_NAME}`,
          description: "Posities in de Nederlandse staatsinrichting, met organisatie en bron.",
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: <T area="entity" k="positionsIndexTitle" /> }]} />

      <header className="mt-4 flex items-baseline gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          <T area="entity" k="positionsIndexTitle" />
        </h1>
        <span className="text-sm tabular-nums text-ink-faint">
          <LocalCount value={total} />
        </span>
      </header>

      <PositionsIndexView initial={rows.slice(0, INDEX_FIRST_SCREEN.posities)} groups={groups} total={total} />
    </>
  );
}
