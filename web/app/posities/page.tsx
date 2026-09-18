import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import {
  getDatasetDate,
  getOrganizationById,
  getPositions,
} from "@/lib/data";
import { formatCount } from "@/lib/format";
import { ORG_TYPE_LABELS } from "@/lib/labels";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import type { OrgType, Position } from "@/lib/types";

export const metadata: Metadata = pageMetadata({
  title: "Posities",
  description:
    "Alle posities in de dataset, gegroepeerd naar type, met de organisatie waar de positie toe hoort en een bron per wettelijke basis.",
  path: "/posities/",
  snapshotDate: getDatasetDate(),
});

const TYPE_ORDER: OrgType[] = ["elected", "dept_head", "commission"];

type TypeGroup = { type: OrgType; positions: Position[] };

function groupByType(positions: Position[]): TypeGroup[] {
  const map = new Map<string, Position[]>();
  for (const position of positions) {
    const list = map.get(position.type);
    if (list) list.push(position);
    else map.set(position.type, [position]);
  }
  const order = [...TYPE_ORDER, ...[...map.keys()].filter((type) => !TYPE_ORDER.includes(type as OrgType))];
  return order
    .filter((type) => map.has(type))
    .map((type) => ({ type: type as OrgType, positions: map.get(type) ?? [] }));
}

export default function PositionsIndexPage() {
  const positions = [...getPositions()].sort((a, b) => a.title.localeCompare(b.title, "nl"));
  const groups = groupByType(positions);
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

      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: "Posities" }]} />

      <header className="mt-4 border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Posities</h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
          Alle {formatCount(positions.length)} posities in de dataset, gegroepeerd naar type. Elke
          positiepagina toont de wettelijke basis, de vulwijze en de reeks bekleders met een bron.
        </p>
      </header>

      {groups.map((group) => (
        <section
          key={group.type}
          aria-labelledby={`type-${group.type}`}
          className="border-b border-line py-6 last:border-b-0"
        >
          <h2
            id={`type-${group.type}`}
            className="text-lg font-semibold tracking-tight text-ink"
          >
            {ORG_TYPE_LABELS[group.type] ?? group.type}
            <span className="ms-2 text-sm font-normal text-ink-faint">
              {formatCount(group.positions.length)}
            </span>
          </h2>
          <ul className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {group.positions.map((position) => {
              const organization = getOrganizationById(position.organization);
              return (
                <li key={position.id}>
                  <article className="rounded-md border border-line bg-surface p-3 transition-fast hover:border-line-strong">
                    <h3 className="text-sm font-medium">
                      <Link
                        href={`/posities/${position.slug}/`}
                        className="text-ink underline-offset-2 hover:text-accent-text hover:underline"
                      >
                        {position.title}
                      </Link>
                    </h3>
                    {organization ? (
                      <p className="mt-0.5 text-xs text-ink-muted">
                        <Link
                          href={`/organisaties/${organization.slug}/`}
                          className="underline-offset-2 hover:text-ink hover:underline"
                        >
                          {organization.name}
                        </Link>
                      </p>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
