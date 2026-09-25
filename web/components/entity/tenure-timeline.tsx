import type { ReactNode } from "react";
import { type TimelineItem } from "@/components/timeline";
import { PersonPortrait } from "./person-portrait";
import { QuietSource } from "@/components/change/quiet-source";
import { T } from "@/components/i18n/t";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { TimelineT } from "./timeline-t";
import { SUMMARY_CLASS } from "./entity-connections";
import { getOrganizationById, getPersonById, getPositionById, getSourceById } from "@/lib/data";
import { titleNamesBody } from "@/lib/changes";
import { tenureEndReason, tenureEntryMode } from "@/lib/entity";
import type { Tenure } from "@/lib/types";

type TenureTimelineVariant = "organization" | "position" | "person";

function Source({ tenure }: { tenure: Tenure }) {
  const source = getSourceById(tenure.source.source);
  if (!source) return null;
  return <QuietSource href={source.url} publisher={source.publisher} retrieved={tenure.source.retrieved} />;
}

/**
 * The tenure history of a person, position or organisation on a rail:
 * portrait or initials, peek links, the period in the site locale, the
 * acting, entry mode and end reason labels translated, and a quiet source.
 */
export function TenureTimeline({
  tenures,
  variant,
  labelKey,
  limit,
}: {
  tenures: Tenure[];
  variant: TenureTimelineVariant;
  labelKey: string;
  /** Show this many first; the rest sit behind a "Toon alle" disclosure. */
  limit?: number;
}) {
  const items: TimelineItem[] = tenures.map((tenure) => {
    const position = getPositionById(tenure.position);
    const organization = position ? getOrganizationById(position.organization) : undefined;
    const person = getPersonById(tenure.person);

    const badges: ReactNode[] = [];
    const entryMode = tenureEntryMode(tenure);
    if (tenure.acting && entryMode !== "waarnemend") badges.push(<LocaleLabel kind="entryMode" value="waarnemend" />);
    if (entryMode !== null && entryMode !== "benoemd") badges.push(<LocaleLabel kind="entryMode" value={entryMode} />);
    const endReason = tenureEndReason(tenure);
    if (endReason !== null) badges.push(<LocaleLabel kind="endReason" value={endReason} />);

    const personLink = person ? (
      <EntityPeekLink id={person.id} variant="plain" />
    ) : (
      <T area="entity" k="unknownPerson" />
    );
    const positionLink = position ? (
      <EntityPeekLink id={position.id} variant="plain" />
    ) : (
      <T area="entity" k="unknownPosition" />
    );

    let title: ReactNode;
    let meta: ReactNode = null;
    if (variant === "position") {
      title = personLink;
    } else if (variant === "organization") {
      title = positionLink;
      meta = person ? <EntityPeekLink id={person.id} variant="quiet" /> : <T area="entity" k="unknownPerson" />;
    } else {
      title = positionLink;
      // Skip the body when the position title already names it.
      if (!organization) meta = <T area="entity" k="unknownOrganization" />;
      else if (!position || !titleNamesBody(position.title, organization.name)) {
        meta = <EntityPeekLink id={organization.id} variant="quiet" />;
      }
    }

    return {
      id: tenure.id,
      title,
      meta,
      icon: person && variant !== "person" ? <PersonPortrait person={person} size={36} /> : undefined,
      start: tenure.start,
      end: tenure.end,
      current: tenure.end === null,
      badges,
      source: <Source tenure={tenure} />,
    };
  });

  if (limit === undefined || items.length <= limit + 1) return <TimelineT items={items} labelKey={labelKey} />;
  return (
    <>
      <TimelineT items={items.slice(0, limit)} labelKey={labelKey} />
      <details className="motion-disclosure mt-2">
        <summary className={SUMMARY_CLASS}>
          <T area="common" k="seeAll" vars={{ n: items.length }} />
        </summary>
        <div className="mt-2">
          <TimelineT items={items.slice(limit)} labelKey={labelKey} />
        </div>
      </details>
    </>
  );
}
