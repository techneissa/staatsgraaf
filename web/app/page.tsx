import type { Metadata } from "next";
import Link from "next/link";
import { ChangePanel } from "@/components/home/change-panel";
import { NewsBand } from "@/components/home/news-band";
import { OverviewCounts } from "@/components/home/overview-counts";
import { PeopleStrip } from "@/components/home/people-strip";
import { BudgetTotals } from "@/components/budget/budget-totals";
import { L, T } from "@/components/i18n/t";
import { JsonLd } from "@/components/json-ld";
import { TranslationInfo } from "@/components/home/translation-info";
import { getDatasetDate, getOrganizationCounts } from "@/lib/data";
import { getFocusPeople, getHomeNews, getSubOrganizationCount } from "@/lib/home";
import { getBudgetOverview } from "@/lib/budget";
import { absoluteUrl, pageMetadata, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: `${SITE_NAME}: de Nederlandse rijksoverheid in kaart`,
  description: SITE_TAGLINE,
  path: "/",
  absoluteTitle: true,
  snapshotDate: getDatasetDate(),
});

export default function HomePage() {
  const siteUrl = absoluteUrl("/");
  const counts = getOrganizationCounts();
  const news = getHomeNews(3);
  const people = getFocusPeople(12);
  const subOrganizations = getSubOrganizationCount();
  const budget = getBudgetOverview();

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

      <section aria-labelledby="nieuws-titel" className="border-b border-line pb-6">
        <div className="flex items-center gap-1.5">
          <h2
            id="nieuws-titel"
            className="text-lg font-semibold tracking-tight text-ink"
          >
            <L nl="Recent nieuws" en="Recent news" />
          </h2>
          <TranslationInfo />
        </div>
        <div className="mt-3">
          <NewsBand items={news} />
        </div>
      </section>

      {people.length > 0 ? (
        <section aria-labelledby="mensen-titel" className="border-b border-line py-6">
          <h2 id="mensen-titel" className="text-lg font-semibold tracking-tight text-ink">
            {news.length > 0 ? (
              <L nl="Mensen in het nieuws" en="People in the news" />
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
        <h2 id="wijzigingen-titel" className="text-lg font-semibold tracking-tight text-ink">
          <L nl="Recente wijzigingen" en="Recent changes" />
        </h2>
        <ChangePanel />
      </section>

      <section aria-labelledby="overzicht-titel" className="border-b border-line py-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="overzicht-titel" className="text-lg font-semibold tracking-tight text-ink">
            <L nl="Overzicht" en="Overview" />
          </h2>
          <Link
            href="/organisaties/"
            className="inline-flex min-h-11 items-center rounded-sm px-1 text-sm font-medium text-accent-text underline-offset-2 hover:underline sm:min-h-0"
          >
            <L nl="Alle organisaties" en="All organizations" />
          </Link>
        </div>
        <OverviewCounts
          total={counts.total}
          subOrganizations={subOrganizations}
          byType={counts.byType}
          byBranch={counts.byBranch}
        />
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
        <div className="mt-3">
          <BudgetTotals overview={budget} />
        </div>
      </section>

      <section aria-labelledby="over-titel" className="pt-6">
        <h2 id="over-titel" className="text-lg font-semibold tracking-tight text-ink">
          <L nl="Over" en="About" />
        </h2>
        <p className="mt-1 max-w-prose text-sm leading-snug text-ink-muted">
          <T area="home" k="chgIntro" />{" "}
          <Link
            href="/methodiek/"
            className="inline-flex min-h-8 items-center whitespace-nowrap font-medium text-accent-text underline-offset-2 hover:underline pointer-coarse:min-h-11"
          >
            <T area="home" k="chgIntroLink" />
          </Link>
        </p>
      </section>
    </>
  );
}
