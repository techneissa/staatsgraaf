import { Count } from "@/components/i18n/count";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/card";
import { ChangePanel } from "@/components/home/change-panel";
import { ChangeStatTiles } from "@/components/change/stat-tiles";
import { getChangeTileFigures } from "@/components/change/change-figures";
import {
  ChangeWindowTabs,
  type ChangeWindowPanel,
} from "@/components/home/change-window-tabs";
import { NewsBand } from "@/components/home/news-band";
import { PeopleStrip } from "@/components/home/people-strip";
import { BudgetTotals } from "@/components/budget/budget-totals";
import { L, T } from "@/components/i18n/t";
import { JsonLd } from "@/components/json-ld";
import { getDatasetDate, getOrganizationCounts } from "@/lib/data";
import { formatCount } from "@/lib/format";
import {
  getChangeWindows,
  getFocusPeople,
  getHomeNews,
  getSubOrganizationCount,
} from "@/lib/home";
import { getBudgetOverview } from "@/lib/budget";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { absoluteUrl, pageMetadata, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import type { OrgBranch, OrgType } from "@/lib/types";

export const metadata: Metadata = pageMetadata({
  title: `${SITE_NAME}: de Nederlandse rijksoverheid in kaart`,
  description: SITE_TAGLINE,
  path: "/",
  absoluteTitle: true,
  snapshotDate: getDatasetDate(),
});

/** A headline count: a calm label over a figure that never wraps. */
function OverviewFigure({ label, value }: { label: ReactNode; value: number }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-surface px-3 py-2.5">
      <dt className="text-xs leading-snug text-ink-muted">{label}</dt>
      <dd className="mt-0.5 whitespace-nowrap text-xl font-semibold tabular-nums tracking-tight text-ink @[30rem]:text-2xl">
        <Count value={value} />
      </dd>
    </div>
  );
}

/**
 * Counts as one column of label and number rows: the number right-aligned in
 * tabular figures, a hairline bar under each row for its share of the
 * largest. One column at any width, so a number never runs into the next
 * label; the two lists sit side by side only where the column is wide.
 */
function CountList({
  title,
  entries,
}: {
  title: ReactNode;
  entries: { key: string; label: ReactNode; count: number }[];
}) {
  const max = Math.max(1, ...entries.map((entry) => entry.count));
  return (
    <Card className="min-w-0 px-3 py-3">
      <h3 className="text-[13px] font-medium text-ink-muted">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {entries.map((entry) => (
          <li key={entry.key} className="text-[13px]">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-ink">{entry.label}</span>
              <span className="shrink-0 whitespace-nowrap tabular-nums text-ink-muted"><Count value={entry.count} /></span>
            </div>
            <div aria-hidden="true" className="mt-1 h-0.5 rounded-pill bg-surface-inset">
              <div className="h-full rounded-pill bg-line-strong" style={{ width: `${Math.max(2, (entry.count / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function HomePage() {
  const siteUrl = absoluteUrl("/");
  const counts = getOrganizationCounts();
  const news = getHomeNews(3);
  const people = getFocusPeople(12);
  const windows = getChangeWindows();
  const subOrganizations = getSubOrganizationCount();
  const budget = getBudgetOverview();

  const panels: ChangeWindowPanel[] = windows.map((window) => ({
    value: window.key,
    days: window.days,
    content: <ChangePanel window={window} />,
  }));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          description: SITE_TAGLINE,
          inLanguage: "nl-NL",
          ...(siteUrl !== undefined ? { url: siteUrl } : {}),
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${siteUrl ?? "/"}?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        }}
      />

      <h1 className="sr-only">{SITE_NAME}</h1>

      <section aria-labelledby="nieuws-titel" className="border-b border-line pb-6 pt-2">
        <h2
          id="nieuws-titel"
          className="text-lg font-semibold tracking-tight text-ink"
        >
          <L nl="Laatste nieuws" en="Latest news" />
        </h2>
        <p className="mt-1 text-xs text-ink-faint">
          <a href="/methodiek/#machinevertaling" className="underline decoration-line underline-offset-2 hover:text-ink">
            <L nl="Anderstalige berichten zijn automatisch vertaald." en="Items in another language are machine translated." />
          </a>
        </p>
        <div className="mt-3">
          <NewsBand items={news} />
        </div>
      </section>

      {people.length > 0 ? (
        <section aria-labelledby="mensen-titel" className="border-b border-line py-6">
          <h2 id="mensen-titel" className="text-lg font-semibold tracking-tight text-ink">
            {news.length > 0 ? (
              <L nl="Wie in het nieuws" en="Who is in the news" />
            ) : (
              <L nl="Huidige functionarissen" en="Current office holders" />
            )}
          </h2>
          <div className="mt-4">
            <PeopleStrip people={people} />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="wijzigingen-titel" className="border-b border-line py-6">
        <ChangeWindowTabs
          heading={
            <h2 id="wijzigingen-titel" className="text-lg font-semibold tracking-tight text-ink">
              <L nl="Laatste wijzigingen" en="Latest changes" />
            </h2>
          }
          chips={<ChangeStatTiles figures={getChangeTileFigures()} className="mt-3" />}
          panels={panels}
          defaultValue="30d"
        />
      </section>

      <section aria-labelledby="overzicht-titel" className="border-b border-line py-6">
        <h2 id="overzicht-titel" className="text-lg font-semibold tracking-tight text-ink">
          <L nl="Overzicht" en="Overview" />
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <OverviewFigure label={<L nl="Organisaties" en="Organizations" />} value={counts.total} />
          <OverviewFigure label={<L nl="Suborganisaties" en="Sub-organizations" />} value={subOrganizations} />
        </dl>
        <div className="mt-3 grid gap-3 @[38rem]:grid-cols-2">
          <CountList
            title={<L nl="Naar type" en="By type" />}
            entries={counts.byType.map((entry) => ({
              key: entry.key,
              count: entry.count,
              label: <LocaleLabel kind="type" value={entry.key as OrgType} />,
            }))}
          />
          <CountList
            title={<L nl="Naar branche" en="By branch" />}
            entries={counts.byBranch.map((entry) => ({
              key: entry.key,
              count: entry.count,
              label: <LocaleLabel kind="branch" value={entry.key as OrgBranch} />,
            }))}
          />
        </div>
      </section>

      <section aria-labelledby="begroting-titel" className="py-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="begroting-titel" className="text-lg font-semibold tracking-tight text-ink">
            <L nl="Begroting" en="Budget" />
          </h2>
          <Link
            href="/begroting/"
            className="inline-flex min-h-11 items-center rounded-sm px-1 text-sm font-medium text-accent-text underline-offset-2 hover:underline sm:min-h-0"
          >
            <L nl="Begroting verkennen" en="Explore the budget" />
          </Link>
        </div>
        <div className="mt-3">
          <BudgetTotals overview={budget} />
        </div>
      </section>

    </>
  );
}
