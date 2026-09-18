import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/card";
import { ChangePanel } from "@/components/home/change-panel";
import { ChangeStats } from "@/components/home/change-stats";
import {
  ChangeWindowTabs,
  type ChangeWindowPanel,
} from "@/components/home/change-window-tabs";
import { NewsBand } from "@/components/home/news-band";
import { PeopleStrip } from "@/components/home/people-strip";
import { JsonLd } from "@/components/json-ld";
import { getOrganizationCounts } from "@/lib/data";
import { formatCount } from "@/lib/format";
import {
  getChangeStats,
  getChangeWindows,
  getFocusPeople,
  getHomeNews,
  getSubOrganizationCount,
} from "@/lib/home";
import { ORG_BRANCH_LABELS, ORG_TYPE_LABELS } from "@/lib/labels";
import { SCOPE_LABEL, SITE_NAME, SITE_TAGLINE, canonical } from "@/lib/site";
import type { OrgBranch, OrgType } from "@/lib/types";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME}: de Nederlandse rijksoverheid in kaart` },
  description: SITE_TAGLINE,
  alternates: canonical("/"),
};

export default function HomePage() {
  const counts = getOrganizationCounts();
  const news = getHomeNews(6);
  const people = getFocusPeople(10);
  const stats = getChangeStats();
  const windows = getChangeWindows();
  const subOrganizations = getSubOrganizationCount();

  const panels: ChangeWindowPanel[] = windows.map((window) => ({
    value: window.key,
    label: `${window.days}D`,
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
        }}
      />

      <section className="border-b border-line pb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-accent-text">
          {SCOPE_LABEL}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          De Nederlandse rijksoverheid in kaart
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">{SITE_TAGLINE}</p>
      </section>

      <section aria-labelledby="nieuws-titel" className="border-b border-line py-6">
        <h2 id="nieuws-titel" className="text-lg font-semibold tracking-tight text-ink">
          Laatste nieuws
        </h2>
        <NewsBand items={news} />
      </section>

      <section aria-labelledby="mensen-titel" className="border-b border-line py-6">
        <h2 id="mensen-titel" className="text-lg font-semibold tracking-tight text-ink">
          Wie in het nieuws
        </h2>
        {news.length > 0 ? (
          <p className="mt-1 text-sm text-ink-muted">
            De meest genoemde personen in de nieuwsberichten van de laatste periode.
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-muted">
            Nog geen nieuwsanalyse beschikbaar. Hieronder staan mensen met een lopende functie in de
            dataset, op volgorde van functie.
          </p>
        )}
        {people.length > 0 ? (
          <div className="mt-3">
            <PeopleStrip people={people} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-faint">Nog geen personen met een lopende functie.</p>
        )}
      </section>

      <section aria-labelledby="wijzigingen-titel" className="border-b border-line py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="wijzigingen-titel" className="text-lg font-semibold tracking-tight text-ink">
            Laatste wijzigingen
          </h2>
          <ChangeWindowTabs panels={panels} defaultValue="30d" />
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          De wijzigingenfeed wordt gevuld door de dagelijkse vergelijking van de dataset met de
          vorige versie. Aanstellingen, vertrekken en structuurwijzigingen verschijnen hier met een
          bron per wijziging.
        </p>
        <ChangeStats stats={stats} />
      </section>

      <section aria-labelledby="overzicht-titel" className="border-b border-line py-6">
        <h2 id="overzicht-titel" className="text-lg font-semibold tracking-tight text-ink">
          Overzicht
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Tellingen op het hoogste niveau voor het Rijk.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card>
            <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              Naar type
            </h3>
            <ul className="mt-2.5 space-y-1.5">
              {counts.byType.map((entry) => (
                <li key={entry.key} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink-muted">
                    {ORG_TYPE_LABELS[entry.key as OrgType] ?? entry.key}
                  </span>
                  <span className="tabular-nums text-ink">{formatCount(entry.count)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              Naar branche
            </h3>
            <ul className="mt-2.5 space-y-1.5">
              {counts.byBranch.map((entry) => (
                <li key={entry.key} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink-muted">
                    {ORG_BRANCH_LABELS[entry.key as OrgBranch] ?? entry.key}
                  </span>
                  <span className="tabular-nums text-ink">{formatCount(entry.count)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          {formatCount(counts.total)} organisaties in totaal, waarvan {formatCount(subOrganizations)}{" "}
          suborganisaties.{" "}
          <a href="#over" className="text-accent-text underline-offset-2 hover:underline">
            Over deze kaart
          </a>
        </p>
      </section>

      <section id="over" aria-labelledby="over-titel" className="py-6">
        <h2 id="over-titel" className="text-lg font-semibold tracking-tight text-ink">
          Over deze kaart
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
          Deze kaart brengt de Nederlandse rijksoverheid in kaart als een open, bronvaste grafiek
          van organisaties, posities, personen en hun onderlinge relaties. Elk gegeven verwijst naar
          de bron waar het vandaan komt, met een ophaaldatum.
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li>
            <Link
              href="/methodiek/"
              className="text-accent-text underline-offset-2 hover:underline"
            >
              Methodiek en verantwoording
            </Link>
          </li>
          <li>
            <Link href="/privacy/" className="text-accent-text underline-offset-2 hover:underline">
              Privacy
            </Link>
          </li>
          <li>
            <Link
              href="/toegankelijkheid/"
              className="text-accent-text underline-offset-2 hover:underline"
            >
              Toegankelijkheid
            </Link>
          </li>
        </ul>
      </section>
    </>
  );
}
