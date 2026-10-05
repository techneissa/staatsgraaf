import Link from "next/link";
import { QuietSource } from "@/components/change/quiet-source";
import { SourceIcons } from "@/components/source-icon";
import { L, T } from "@/components/i18n/t";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { SUMMARY_CLASS } from "./entity-connections";
import { isGenericOrganization, sortCareerNewestFirst } from "@/lib/entity-page";
import type { CareerGroupView, CareerItemView } from "@/lib/careers";
import type { CareerKind } from "@/lib/types";

/** Rows shown per kind before the disclosure. */
const INITIAL_ROWS = 5;

export const CAREER_KIND_LABEL: Record<CareerKind, { nl: string; en: string }> = {
  beroep: { nl: "Beroep", en: "Occupation" },
  politiek: { nl: "Politiek", en: "Politics" },
  loopbaan: { nl: "Werk", en: "Work" },
  nevenfunctie: { nl: "Nevenfuncties", en: "Other positions" },
  opleiding: { nl: "Opleiding", en: "Education" },
};

const KIND_COLOR: Record<CareerKind, string> = {
  beroep: "var(--t-color-line-strong)",
  politiek: "var(--t-color-sector-staten-generaal)",
  loopbaan: "var(--t-color-sector-regering)",
  nevenfunctie: "var(--t-color-sector-zelfstandig)",
  opleiding: "var(--t-color-sector-adviescolleges)",
};

/** The party a generic "fractie" entry stands for, when the person's party is on record. */
export type CareerFractie = { label: string; href: string };

function CareerRow({ item, fractie }: { item: CareerItemView; fractie: CareerFractie | null }) {
  // "fractie" alone says nothing: name the person's party when the data has it, else say nothing.
  const generic = item.organizationId === null && isGenericOrganization(item.organization);
  const organization = generic ? null : item.organization;
  const fractieLink = generic ? fractie : null;
  return (
    <li className="relative ps-5 pb-3 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute start-0 top-1.5 h-2.5 w-2.5 -translate-x-[4.5px] rounded-full ring-2 ring-surface rtl:translate-x-[4.5px]"
        style={{ backgroundColor: item.current ? KIND_COLOR[item.kind] : "var(--t-color-line-strong)" }}
      />
      {item.years !== null ? (
        <p className="text-xs tabular-nums text-ink-faint">
          <L nl={item.years.nl} en={item.years.en} />
        </p>
      ) : null}
      <p className="text-sm leading-snug text-ink break-words" lang="nl">
        {item.title}
      </p>
      {organization !== null || fractieLink !== null || item.source !== null ? (
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
          {item.organizationId !== null ? (
            <EntityPeekLink id={item.organizationId} variant="quiet">
              {item.organization ?? undefined}
            </EntityPeekLink>
          ) : fractieLink !== null ? (
            <Link href={fractieLink.href} className="underline underline-offset-[3px] hover:text-ink">
              {fractieLink.label}
            </Link>
          ) : organization !== null ? (
            <span lang="nl">{organization}</span>
          ) : null}
          {item.source !== null ? (
            <QuietSource href={item.source.url} publisher={item.source.publisher} retrieved={item.source.retrieved} />
          ) : null}
        </p>
      ) : null}
    </li>
  );
}

function Rail({ items, fractie }: { items: CareerItemView[]; fractie: CareerFractie | null }) {
  return (
    <ol className="ms-1 border-s border-line">
      {items.map((item) => (
        <CareerRow key={item.id} item={item} fractie={fractie} />
      ))}
    </ol>
  );
}

/** Occupations as one row of small tags, with their sources on one quiet line. */
function OccupationTags({ items }: { items: CareerItemView[] }) {
  const sources = new Map<string, NonNullable<CareerItemView["source"]>>();
  for (const item of items) if (item.source !== null && !sources.has(item.source.url)) sources.set(item.source.url, item.source);
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium text-ink-muted">
        <L nl={CAREER_KIND_LABEL.beroep.nl} en={CAREER_KIND_LABEL.beroep.en} />
      </h3>
      <ul className="flex flex-wrap items-center gap-1.5">
        {items.map((item) => (
          <li key={item.id} lang="nl" className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink">
            {item.title}
          </li>
        ))}
        {sources.size > 0 ? (
          <li className="ms-1 inline-flex">
            <SourceIcons
              sources={[...sources.values()].map((source) => ({ href: source.url, title: source.publisher, retrieved: source.retrieved }))}
            />
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/**
 * A person's career as a calm vertical rail per kind (politics, career, side
 * positions, education): the years, the title, the organisation as a peek
 * link when it is in the dataset, and the source of each step.
 */
export function CareerTimeline({ groups, fractie = null }: { groups: CareerGroupView[]; fractie?: CareerFractie | null }) {
  if (groups.length === 0) return null;
  return (
    <div className="space-y-5">
      {groups.map((group) => {
        if (group.kind === "beroep") return <OccupationTags key={group.kind} items={group.items} />;
        const sorted = sortCareerNewestFirst(group.items);
        const visible = sorted.slice(0, INITIAL_ROWS);
        const rest = sorted.slice(INITIAL_ROWS);
        return (
          <section key={group.kind}>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-muted">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-[3px]"
                style={{ backgroundColor: KIND_COLOR[group.kind] }}
              />
              <L nl={CAREER_KIND_LABEL[group.kind].nl} en={CAREER_KIND_LABEL[group.kind].en} />
              <span className="tabular-nums text-ink-faint">({group.items.length})</span>
            </h3>
            <Rail items={visible} fractie={fractie} />
            {rest.length > 0 ? (
              <details className="motion-disclosure mt-2">
                <summary className={SUMMARY_CLASS}>
                  <T area="common" k="seeAll" vars={{ n: group.items.length }} />
                </summary>
                <div className="mt-2">
                  <Rail items={rest} fractie={fractie} />
                </div>
              </details>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
