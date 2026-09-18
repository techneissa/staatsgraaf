import Link from "next/link";
import { type TimelineItem } from "@/components/timeline";
import { PersonPortrait } from "./person-portrait";
import { SourceLink } from "@/components/source-link";
import { T } from "@/components/i18n/t";
import { TimelineT } from "./timeline-t";
import { getOrganizationById, getPersonById, getPositionById, getSourceById } from "@/lib/data";
import { END_REASON_LABELS, ENTRY_MODE_LABELS } from "@/lib/labels";
import { tenureEndReason, tenureEntryMode } from "@/lib/entity";
import { formatPeriod } from "@/lib/format";
import type { Tenure } from "@/lib/types";

type TenureTimelineVariant = "organization" | "position" | "person";

function linkClass(): string {
  return "underline-offset-2 hover:text-accent-text hover:underline";
}

function Source({ tenure }: { tenure: Tenure }) {
  const source = getSourceById(tenure.source.source);
  if (!source) return null;
  return (
    <SourceLink href={source.url} meta={source.publisher}>
      <T area="entity" k="sourceLabel" />
    </SourceLink>
  );
}

export function TenureTimeline({
  tenures,
  variant,
  labelKey,
}: {
  tenures: Tenure[];
  variant: TenureTimelineVariant;
  labelKey: string;
}) {
  const items: TimelineItem[] = tenures.map((tenure) => {
    const position = getPositionById(tenure.position);
    const organization = position ? getOrganizationById(position.organization) : undefined;
    const person = getPersonById(tenure.person);

    const badges: string[] = [];
    if (tenure.acting) badges.push("Waarnemend");
    const entryMode = tenureEntryMode(tenure);
    if (entryMode !== null && entryMode !== "benoemd") {
      const entryLabel = ENTRY_MODE_LABELS[entryMode];
      if (entryLabel !== undefined) badges.push(entryLabel);
    }
    const endReason = tenureEndReason(tenure);
    if (endReason !== null) badges.push(END_REASON_LABELS[endReason]);

    let title: React.ReactNode;
    if (variant === "position") {
      title = person ? (
        <Link href={`/personen/${person.slug}/`} className={linkClass()}>
          {person.name}
        </Link>
      ) : (
        <T area="entity" k="unknownPerson" />
      );
    } else {
      title = position ? (
        <Link href={`/posities/${position.slug}/`} className={linkClass()}>
          {position.title}
        </Link>
      ) : (
        <T area="entity" k="unknownPosition" />
      );
    }

    let meta: React.ReactNode = null;
    if (variant === "organization") {
      meta = person ? (
        <Link href={`/personen/${person.slug}/`} className={linkClass()}>
          {person.name}
        </Link>
      ) : (
        <T area="entity" k="unknownPerson" />
      );
    } else if (variant === "person") {
      meta = organization ? (
        <Link href={`/organisaties/${organization.slug}/`} className={linkClass()}>
          {organization.name}
        </Link>
      ) : (
        <T area="entity" k="unknownOrganization" />
      );
    }

    return {
      id: tenure.id,
      title,
      meta: (
        <span className="inline-flex flex-wrap items-baseline gap-x-2">
          {meta}
          <Source tenure={tenure} />
        </span>
      ),
      icon:
        person && variant !== "person" ? <PersonPortrait person={person} size={32} /> : undefined,
      period: formatPeriod(tenure.start, tenure.end),
      current: tenure.end === null,
      badges,
    };
  });

  return <TimelineT items={items} labelKey={labelKey} />;
}
