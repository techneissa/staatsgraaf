import Link from "next/link";
import { Card } from "./card";
import { DateStamp } from "./date-stamp";
import { PersonPortrait } from "./entity/person-portrait";
import { KindBadge } from "./kind-badge";
import { SourceLink } from "./source-link";
import { T } from "@/components/i18n/t";
import { getOrganizationById, getPersonById, getPositionById, getSourceById } from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { Change, ChangeKind, ChangeSide } from "@/lib/types";

const KIND_KEY: Record<ChangeKind, string> = {
  appointment: "appointed",
  departure: "departure",
  vacancy: "vacancy",
  structural: "structuralChange",
  "tenure-between": "transfer",
  rename: "renameLabel",
  move: "moveLabel",
};

function Side({ label, side }: { label: string; side?: ChangeSide }) {
  if (!side) return null;
  const person = side.person !== null ? getPersonById(side.person) : undefined;
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-faint">
        <T area="home" k={label} />
      </span>
      {person ? (
        <Link
          href={`/personen/${person.slug}/`}
          className="inline-flex items-center gap-2 text-sm text-accent-text underline-offset-2 hover:underline"
        >
          <PersonPortrait person={person} size={24} />
          {person.name}
        </Link>
      ) : (
        <span className="text-sm text-ink-muted">{side.label}</span>
      )}
    </div>
  );
}

export function ChangeRow({ change }: { change: Change }) {
  const position = change.position !== null ? getPositionById(change.position) : undefined;
  const organization =
    change.organization !== null ? getOrganizationById(change.organization) : undefined;
  const source = getSourceById(change.source.source);

  return (
    <Card as="article">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <KindBadge tone={change.kind === "appointment" ? "accent" : "neutral"}>
          <T area="common" k={KIND_KEY[change.kind]} />
        </KindBadge>
        {source ? (
          <SourceLink href={source.url} meta={source.publisher}>
            <time dateTime={change.date}>{formatDate(change.date)}</time>
          </SourceLink>
        ) : (
          <DateStamp date={change.date} />
        )}
      </div>
      <p className="mt-2 text-sm leading-normal text-ink">{change.summary}</p>
      {position ? (
        <p className="mt-1 text-sm text-ink-muted">
          <Link
            href={`/posities/${position.slug}/`}
            className="underline-offset-2 hover:text-ink hover:underline"
          >
            {position.title}
          </Link>
          {organization ? (
            <>
              {" "}
              <span aria-hidden="true">·</span>{" "}
              <Link
                href={`/organisaties/${organization.slug}/`}
                className="underline-offset-2 hover:text-ink hover:underline"
              >
                {organization.name}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      <div className="mt-3 space-y-1.5 border-t border-line pt-3">
        {change.kind === "vacancy" ? (
          <Side label="seatsLabel" side={change.in} />
        ) : (
          <>
            <Side label="outLabel" side={change.out} />
            <Side label="inLabel" side={change.in} />
          </>
        )}
      </div>
    </Card>
  );
}
