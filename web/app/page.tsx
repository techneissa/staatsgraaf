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
import { L } from "@/components/i18n/t";
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
import { ORG_BRANCH_LABELS, ORG_TYPE_LABELS } from "@/lib/labels";
import { absoluteUrl, pageMetadata, SCOPE_LABEL, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import type { OrgBranch, OrgType } from "@/lib/types";

export const metadata: Metadata = pageMetadata({
  title: `${SITE_NAME}: de Nederlandse rijksoverheid in kaart`,
  description: SITE_TAGLINE,
  path: "/",
  absoluteTitle: true,
  snapshotDate: getDatasetDate(),
});

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-accent-text">
      {children}
    </p>
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

  const panels: ChangeWindowPanel[] = windows.map((window) => ({
    value: window.key,
    label: window.days === 7 ? "7D" : window.days === 30 ? "30D" : "90D",
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
        <Eyebrow>{SCOPE_LABEL}</Eyebrow>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          <L
            nl="De Nederlandse rijksoverheid in kaart"
            en="The Dutch national government, mapped"
          />
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">{SITE_TAGLINE}</p>
      </section>

      <section aria-labelledby="nieuws-titel" className="border-b border-line py-6">
        <Eyebrow>
          <L nl="In het nieuws" en="In the news" />
        </Eyebrow>
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
        <div className="mt-4 grid gap-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Card as="div" className="py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                <L nl="Organisaties" en="Organizations" />
              </p>
              <p className="text-xl font-semibold tabular-nums text-ink">
                {formatCount(counts.total)}
              </p>
            </Card>
            <Card as="div" className="py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                <L nl="Suborganisaties" en="Sub-organizations" />
              </p>
              <p className="text-xl font-semibold tabular-nums text-ink">
                {formatCount(subOrganizations)}
              </p>
            </Card>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Card>
              <h3 className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                <L nl="Naar type" en="By type" />
              </h3>
              <ul className="mt-2 columns-1 gap-x-4 space-y-1 text-xs sm:columns-2">
                {counts.byType.map((entry) => (
                  <li key={entry.key} className="flex items-baseline justify-between gap-2 break-inside-avoid">
                    <span className="text-ink-muted">
                      {ORG_TYPE_LABELS[entry.key as OrgType] ?? entry.key}
                    </span>
                    <span className="tabular-nums text-ink">{formatCount(entry.count)}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h3 className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                <L nl="Naar branche" en="By branch" />
              </h3>
              <ul className="mt-2 columns-1 gap-x-4 space-y-1 text-xs sm:columns-2">
                {counts.byBranch.map((entry) => (
                  <li key={entry.key} className="flex items-baseline justify-between gap-2 break-inside-avoid">
                    <span className="text-ink-muted">
                      {ORG_BRANCH_LABELS[entry.key as OrgBranch] ?? entry.key}
                    </span>
                    <span className="tabular-nums text-ink">{formatCount(entry.count)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          <a href="#over" className="text-accent-text underline-offset-2 hover:underline">
            <L nl="Over deze kaart" en="About this map" />
          </a>
        </p>
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
