import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { T } from "@/components/i18n/t";
import { branchColorVar } from "@/lib/branch-colors";
import {
  getDatasetDate,
  getOrganizationById,
  getPositions,
} from "@/lib/data";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { DateT, LocalCount } from "@/components/content/local-date";
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

      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: <T area="entity" k="positionsIndexTitle" /> }]} />

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          <T area="entity" k="positionsIndexTitle" />
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
          <DateT area="entity" k="positionsIndexIntro" counts={{ n: positions.length }} />
        </p>
      </header>

      {groups.map((group) => (
        <section
          key={group.type}
          aria-labelledby={`type-${group.type}`}
          className="mt-8"
        >
          <h2
            id={`type-${group.type}`}
            className="scroll-mt-20 border-b border-line pb-2 text-lg font-semibold tracking-tight text-ink"
          >
            <LocaleLabel kind="type" value={group.type} />
            <span className="ms-2 text-sm font-normal tabular-nums text-ink-faint">
              <LocalCount value={group.positions.length} />
            </span>
          </h2>
          <ul className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {group.positions.map((position) => {
              const organization = getOrganizationById(position.organization);
              const accent = organization ? branchColorVar(organization.branch) : null;
              return (
                <li key={position.id}>
                  <article className="relative flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface p-3 pl-4 transition-fast hover:border-line-strong">
                    {accent !== null ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ backgroundColor: accent }}
                      />
                    ) : null}
                    <h3 className="text-sm font-medium">
                      <Link
                        href={`/posities/${position.slug}/`}
                        className="text-ink underline-offset-2 hover:text-accent-text hover:underline"
                      >
                        {position.title}
                      </Link>
                    </h3>
                    {organization ? (
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        <EntityPeekLink id={organization.id} variant="quiet" />
                      </p>
                    ) : null}
                    {position.seatsCount !== null ? (
                      <p className="mt-auto pt-1.5 text-xs tabular-nums text-ink-faint">
                        <DateT
                          area="entity"
                          k={position.seatsCount === 1 ? "seatOne" : "seatMany"}
                          counts={{ n: position.seatsCount }}
                        />
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
