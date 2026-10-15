"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { KindGlyph } from "@/components/kind-glyph";
import { PeekLink } from "@/components/peek/peek-link";
import { TemplateT } from "@/components/change/template-t";
import { CHANGE_KIND_KEY, CHANGE_LABEL_TONE, ChangeKindGlyph } from "@/components/change/change-glyph";
import { useLocale } from "@/components/i18n/language-provider";
import { useDict, useT } from "@/components/i18n/use-t";
import { useSelection } from "@/components/selection/selection-provider";
import { formatCountIn, formatDateIn } from "@/lib/format";
import { orgEnGloss, positionEn } from "@/lib/name-gloss";
import { LocalizedEntityLabel } from "@/components/peek/localized-entity-label";
import type { SelectionSurface } from "@/lib/selection";
import type { PanelChange, PanelNews, PanelPerson, PanelRef, PanelSource } from "./panel-data";
import { SelectLink, selectionFor } from "./select-link";
import { SourceIcon } from "@/components/source-icon";

/** The canvas the current pick came from; new picks from a panel stay on it. */
export function useSurface(): SelectionSurface {
  return useSelection().current?.surface ?? "graph";
}

export function usePanelFormat() {
  const locale = useLocale() === "en" ? "en" : "nl";
  return {
    locale,
    count: (value: number) => formatCountIn(value, locale),
    date: (iso: string) => formatDateIn(iso.slice(0, 10), locale, "short"),
  } as const;
}

/**
 * A titled block of a panel. The title is a calm sentence-case label with an
 * optional count; `size` sets how loud it is (the page column profile has
 * room for larger type than the side panel).
 */
export function Section({
  title,
  count,
  children,
  size = "sm",
  className = "",
}: {
  title: ReactNode;
  count?: number | null;
  children: ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  const format = usePanelFormat();
  const id = useId();
  return (
    <section aria-labelledby={id} className={`min-w-0 ${className}`.trim()}>
      <h3
        id={id}
        className={`flex items-baseline gap-2 font-medium text-ink-muted ${size === "md" ? "text-sm" : "text-[13px]"}`}
      >
        <span className="min-w-0">{title}</span>
        {typeof count === "number" ? (
          <span className="shrink-0 tabular-nums text-ink-faint">{format.count(count)}</span>
        ) : null}
      </h3>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

const ROW =
  "group flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-sm px-1.5 py-1 text-start transition-fast hover:bg-surface-inset pointer-coarse:min-h-11";

/** A list that shows the first `limit` items and a quiet button for the rest. */
export function LimitedList<T>({
  items,
  limit,
  render,
  className = "",
  total,
}: {
  items: T[];
  limit: number;
  render: (item: T, index: number) => ReactNode;
  className?: string;
  /** The full count when `items` is only the first part of it; the button then says "more", not "all". */
  total?: number;
}) {
  const t = useT("panels");
  const [open, setOpen] = useState(false);
  const listId = useId();
  const shown = open ? items : items.slice(0, limit);
  return (
    <>
      <ul id={listId} className={className}>
        {shown.map((item, index) => render(item, index))}
      </ul>
      {items.length > limit ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
          className="tap-row mt-0.5 inline-flex min-h-8 items-center rounded-sm px-1.5 text-xs font-medium text-accent-text hover:underline"
        >
          {open ? t("showFewer") : total !== undefined && total > items.length ? t("showMore") : t("showAll", { n: items.length })}
        </button>
      ) : null}
    </>
  );
}

/**
 * One entity as a row: a lead mark, the Dutch name, an optional second line
 * and an optional figure on the right. Organisations, people, news and topics
 * are picked in place; positions open their peek.
 */
export function EntityRow({
  entity,
  lead,
  sub,
  trailing,
}: {
  entity: PanelRef;
  lead?: ReactNode;
  sub?: ReactNode;
  trailing?: ReactNode;
}) {
  const surface = useSurface();
  const locale = useLocale();
  const entityGloss = (entity as PanelRef & { gloss?: string | null }).gloss;
  const gloss = locale === "en" && typeof entityGloss === "string" && entityGloss !== entity.name ? entityGloss : null;
  const body = (
    <>
      {lead ?? null}
      <span className="min-w-0 flex-1">
        <span lang="nl" className="block text-[13px] leading-snug text-ink group-hover:underline decoration-1 underline-offset-2">
          {entity.name}
        </span>
        {gloss ? <span lang="en" className="block text-xs leading-snug text-ink-faint">{gloss}</span> : null}
        {sub ? <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{sub}</span> : null}
      </span>
      {trailing !== undefined && trailing !== null ? (
        <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-ink-muted">{trailing}</span>
      ) : null}
    </>
  );
  const selection = selectionFor(entity.id, surface);
  return (
    <li>
      {selection ? (
        <SelectLink selection={selection} href={entity.href} className={ROW}>
          {body}
        </SelectLink>
      ) : entity.id.startsWith("pos:") ? (
        <PeekLink id={entity.id} href={entity.href} kind="position" variant="plain" className={`${ROW} no-underline hover:no-underline`}>
          {body}
        </PeekLink>
      ) : (
        <a href={entity.href} className={ROW}>
          {body}
        </a>
      )}
    </li>
  );
}

/** A small square in the branch colour, the organisation's mark in lists. */
export function OrgMark({ color }: { color?: string | null }) {
  return (
    <span
      aria-hidden="true"
      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
      style={{ backgroundColor: color ?? "var(--kind-organization)" }}
    />
  );
}

export function PersonRow({
  person,
  sub,
  trailing,
  size = 28,
}: {
  person: Pick<PanelPerson, "id" | "name" | "href"> & Partial<Pick<PanelPerson, "portrait" | "color">>;
  sub?: ReactNode;
  trailing?: ReactNode;
  size?: number;
}) {
  return (
    <EntityRow
      entity={person}
      lead={<Avatar name={person.name} url={person.portrait ?? null} color={person.color ?? null} size={size} />}
      sub={sub}
      trailing={trailing}
    />
  );
}

/** People as a wrap of portraits with their names under them: for groups where faces help (members, key people). */
export function PeopleGrid({
  people,
  limit,
  subFor,
}: {
  people: (Pick<PanelPerson, "id" | "name" | "href"> & Partial<Pick<PanelPerson, "portrait" | "color">>)[];
  limit: number;
  subFor?: (id: string) => ReactNode;
}) {
  const surface = useSurface();
  return (
    <LimitedList
      items={people}
      limit={limit}
      className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-x-2 gap-y-1"
      render={(person) => (
        <li key={person.id} className="min-w-0">
          <SelectLink
            selection={selectionFor(person.id, surface)}
            href={person.href}
            className="group flex h-full min-w-0 flex-col items-center gap-1.5 rounded-sm px-1 py-2 text-center transition-fast hover:bg-surface-inset"
          >
            <Avatar name={person.name} url={person.portrait ?? null} color={person.color ?? null} size={44} />
            <span lang="nl" className="text-xs leading-snug text-ink group-hover:underline decoration-1 underline-offset-2">
              {person.name}
            </span>
            {subFor ? <span className="text-[11px] leading-snug text-ink-muted">{subFor(person.id)}</span> : null}
          </SelectLink>
        </li>
      )}
    />
  );
}

export function NewsRows({ items }: { items: PanelNews[] }) {
  const format = usePanelFormat();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.id}>
          <SelectLink
            selection={{ kind: "news", id: item.id, surface: "power" }}
            href={item.url}
            className="group block rounded-sm px-1.5 py-1.5 transition-fast hover:bg-surface-inset"
          >
            <span lang={item.language} className="block text-[13px] leading-snug text-ink group-hover:underline decoration-1 underline-offset-2">
              {item.title}
            </span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              {item.publisher}, <time dateTime={item.published}>{format.date(item.published)}</time>
            </span>
          </SelectLink>
        </li>
      ))}
    </ul>
  );
}

const SENTENCE_KEY: Record<string, string> = {
  appointment: "changeAppointed",
  acting: "changeActing",
  departure: "changeDeparted",
  vacancy: "changeVacant",
};

function ChangeSentence({ change }: { change: PanelChange }) {
  const surface = useSurface();
  const key = SENTENCE_KEY[change.kind];
  const position = change.position ?? null;
  const person = change.person ?? null;
  const organization = change.organization ?? null;
  if (key === undefined || position === null || (change.kind !== "vacancy" && person === null)) {
    return <span lang="nl">{change.summary}</span>;
  }
  const link = (ref: PanelRef, strong = false) => {
    const selection = selectionFor(ref.id, surface);
    const className = `underline decoration-line-strong decoration-1 underline-offset-2 hover:decoration-current ${strong ? "font-medium text-ink" : "text-ink"}`;
    const english = ref.id.startsWith("org:") ? orgEnGloss(ref.name) : ref.id.startsWith("pos:") ? positionEn(ref.name) : null;
    const label = <LocalizedEntityLabel dutch={ref.name} english={english} />;
    return selection ? (
      <SelectLink selection={selection} href={ref.href} className={className} title={english ? ref.name : undefined}>
        {label}
      </SelectLink>
    ) : (
      <PeekLink id={ref.id} href={ref.href} kind="position" variant="quiet" title={english ? ref.name : undefined}>
        {label}
      </PeekLink>
    );
  };
  const showBody = Boolean(change.showBody) && organization !== null;
  const slots: Record<string, ReactNode> = { position: link(position) };
  if (person) slots.person = link(person, true);
  if (showBody && organization) slots.body = link(organization);
  return <TemplateT area="home" k={showBody ? key : `${key}NoBody`} slots={slots} />;
}

export function ChangeRows({ changes }: { changes: PanelChange[] }) {
  const format = usePanelFormat();
  const th = useT("home");
  return (
    <ul className="space-y-2.5">
      {changes.map((change) => (
        <li key={change.id} className="flex gap-2.5 px-1.5">
          <span className={`mt-0.5 shrink-0 ${CHANGE_LABEL_TONE[change.kind]}`}>
            <ChangeKindGlyph kind={change.kind} />
          </span>
          <div className="min-w-0 text-[13px] leading-snug text-ink-muted">
            <p>
              <ChangeSentence change={change} />
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">
              <span className={CHANGE_LABEL_TONE[change.kind]}>{th(CHANGE_KIND_KEY[change.kind])}</span>,{" "}
              <time dateTime={change.date}>{format.date(change.date)}</time>
              {change.source ? (
                <>
                  {" "}
                  <SourceIcon href={change.source} title={new URL(change.source).host} size={14} className="ms-0.5" />
                </>
              ) : null}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Key figures as label and number rows; numbers are right-aligned and never wrap. */
export function Facts({ items }: { items: { key: string; label: ReactNode; value: number | null }[] }) {
  const format = usePanelFormat();
  const shown = items.filter((item) => item.value !== null && item.value > 0);
  if (shown.length === 0) return null;
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-x-4 border-y border-line py-1.5">
      {shown.map((item) => (
        <div key={item.key} className="flex min-w-0 items-baseline justify-between gap-2 py-1">
          <dt className="min-w-0 text-xs text-ink-muted">{item.label}</dt>
          <dd className="shrink-0 whitespace-nowrap text-sm font-medium tabular-nums text-ink">{format.count(item.value as number)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The source of a panel record as the shared chain-link icon. */
export function SourceLine({ source }: { source: PanelSource | null | undefined }) {
  if (!source) return null;
  return <SourceIcon href={source.url} title={source.publisher || new URL(source.url).host} retrieved={source.retrieved} />;
}

/** A quiet link to the full page. */
export function OpenPageLink({ href, label }: { href: string; label?: string }) {
  const t = useDict("panels");
  return (
    <Link
      href={href}
      className="tap-row inline-flex min-h-8 items-center gap-1.5 rounded-sm text-xs font-medium text-accent-text hover:underline"
    >
      {label ?? t("openPage")}
      <svg aria-hidden="true" viewBox="0 0 12 12" width="10" height="10">
        <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

/**
 * The way to the full page, as a button at the top of a panel: it is what most
 * readers pick a body for, so it does not wait at the foot of the list.
 */
export function OpenPageButton({ href, label }: { href: string; label?: string }) {
  const t = useDict("panels");
  return (
    <Link
      href={href}
      className="tap-target inline-flex min-h-9 items-center justify-center gap-1.5 rounded-sm border border-line bg-surface px-3 text-[13px] font-medium text-accent-text transition-fast hover:border-line-strong hover:bg-surface-inset pointer-coarse:min-h-11"
    >
      {label ?? t("openPageTop")}
      <svg aria-hidden="true" viewBox="0 0 12 12" width="11" height="11">
        <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

/** Placeholder bars while a record loads, announced once to screen readers. */
export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  const t = useDict("panels");
  return (
    <div role="status" className="space-y-2.5 py-1">
      <span className="sr-only">{t("loading")}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="sg-skeleton h-3.5 rounded-sm" style={{ width: `${88 - index * 13}%` }} />
      ))}
    </div>
  );
}

export { KindGlyph };
