import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/card";
import { ChangePanel } from "@/components/home/change-panel";
import { ChangeStats } from "@/components/home/change-stats";
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
  getChangeStats,
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
        {formatCount(value)}
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
              <span className="shrink-0 whitespace-nowrap tabular-nums text-ink-muted">{formatCount(entry.count)}</span>
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
  const stats = getChangeStats();
  const windows = getChangeWindows();
  const subOrganizations = getSubOrganizationCount();
  const budget = getBudgetOverview();

  const panels: ChangeWindowPanel[] = windows.map((window) => ({
    value: window.key,
    label:
      window.days === 7 ? (
        <L nl="7 dagen" en="7 days" />
      ) : window.days === 30 ? (
        <L nl="30 dagen" en="30 days" />
      ) : (
        <L nl="90 dagen" en="90 days" />
      ),
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

      <section className="border-b border-line pb-6 pt-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          <L
            nl="De Nederlandse rijksoverheid in kaart"
            en="The Dutch national government, mapped"
          />
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
          <T area="common" k="brandTagline" />
        </p>
      </section>

      <section aria-labelledby="nieuws-titel" className="border-b border-line py-6">
        <h2
          id="nieuws-titel"
          className="text-lg font-semibold tracking-tight text-ink"
        >
          <L nl="Laatste nieuws" en="Latest news" />
        </h2>
        <div className="mt-3">
          <NewsBand items={news} />
        </div>
      </section>

      <section aria-labelledby="mensen-titel" className="border-b border-line py-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="mensen-titel" className="text-lg font-semibold tracking-tight text-ink">
            <L nl="Wie in het nieuws" en="Who is in the news" />
          </h2>
        </div>
        {news.length > 0 ? (
          <p className="mt-1 text-sm text-ink-muted">
            <L
              nl="De meest genoemde personen in de nieuwsberichten van de laatste periode."
              en="The people most mentioned in recent news coverage."
            />
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-muted">
            <L
              nl="Nog geen nieuwsanalyse beschikbaar. Hieronder staan mensen met een lopende functie in de dataset, op volgorde van functie."
              en="No news analysis yet. Shown instead are people with an active tenure in the dataset, ordered by position."
            />
          </p>
        )}
        {people.length > 0 ? (
          <div className="mt-4">
            <PeopleStrip people={people} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-faint">
            <L nl="Nog geen personen met een lopende functie." en="No people with an active tenure yet." />
          </p>
        )}
      </section>

      <section aria-labelledby="wijzigingen-titel" className="border-b border-line py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="wijzigingen-titel" className="text-lg font-semibold tracking-tight text-ink">
            <L nl="Laatste wijzigingen" en="Latest changes" />
          </h2>
          <ChangeWindowTabs panels={panels} defaultValue="30d" />
        </div>
        <p className="mt-2 max-w-prose text-sm text-ink-muted">
          <L
            nl="De wijzigingenfeed wordt gevuld door de dagelijkse vergelijking van de dataset met de vorige versie. Aanstellingen, vertrekken en structuurwijzigingen verschijnen hier met een bron per wijziging."
            en="This feed is filled by the daily comparison of the dataset with the previous version. Appointments, departures and structural changes appear here with one source per change."
          />
        </p>
        <ChangeStats stats={stats} />
      </section>

      <section aria-labelledby="overzicht-titel" className="border-b border-line py-6">
        <h2 id="overzicht-titel" className="text-lg font-semibold tracking-tight text-ink">
          <L nl="Overzicht" en="Overview" />
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          <L nl="Tellingen op het hoogste niveau voor het Rijk." en="Top-level counts for the national government." />
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-2">
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
        <p className="mt-3 text-xs text-ink-faint">
          <a href="#over" className="text-accent-text underline-offset-2 hover:underline">
            <L nl="Over deze kaart" en="About this map" />
          </a>
        </p>
      </section>

      <section aria-labelledby="begroting-titel" className="border-b border-line py-6">
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
        <p className="mt-1 text-sm text-ink-muted">
          <L
            nl="De begrote uitgaven, ontvangsten en het saldo van de ministeries, met het verschil tegen het voorgaande jaar."
            en="Budgeted spending, revenue and the balance across the ministries, with the change against the previous year."
          />
        </p>
        <div className="mt-4">
          <BudgetTotals overview={budget} />
        </div>
      </section>

      <section id="over" aria-labelledby="over-titel" className="py-6">
        <h2 id="over-titel" className="text-lg font-semibold tracking-tight text-ink">
          <L nl="Over deze kaart" en="About this map" />
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
          <L
            nl="Deze kaart brengt de Nederlandse rijksoverheid in kaart als een open, bronvaste grafiek van organisaties, posities, personen en hun onderlinge relaties. Elk gegeven verwijst naar de bron waar het vandaan komt, met een ophaaldatum."
            en="This map charts the Dutch national government as an open, source-backed graph of organizations, positions, people and their relationships. Every fact points to the source it comes from, with a retrieval date."
          />
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li>
            <Link
              href="/methodiek/"
              className="text-accent-text underline-offset-2 hover:underline"
            >
              <L nl="Methodiek en verantwoording" en="Methodology" />
            </Link>
          </li>
          <li>
            <Link href="/privacy/" className="text-accent-text underline-offset-2 hover:underline">
              <L nl="Privacy" en="Privacy" />
            </Link>
          </li>
          <li>
            <Link
              href="/toegankelijkheid/"
              className="text-accent-text underline-offset-2 hover:underline"
            >
              <L nl="Toegankelijkheid" en="Accessibility" />
            </Link>
          </li>
        </ul>
      </section>
    </>
  );
}
