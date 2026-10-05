import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { NewsDayList } from "@/components/news/news-day-list";
import { NewsPageLinks } from "@/components/news/news-links";
import { formatCountIn } from "@/lib/format";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { buildNewsDayArchive, formatNewsDayLabel, NEWS_IN_LANGUAGE, newsRouteBase } from "@/lib/news-page";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import type { NewsLanguage } from "@/lib/types";

/** The day archive in one language; both routes render this one component (see NewsMainView). */
export function NewsDayView({ route, date }: { route: NewsLanguage; date: string }) {
  const messages = NEWS_MESSAGES[route];
  const base = newsRouteBase(route);
  const archive = buildNewsDayArchive(date, route);
  const label = formatNewsDayLabel(date, route);
  const total = archive.set.length;
  const pageUrl = absoluteUrl(`${base}/${date}/`);

  return (
    <div lang={route}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${messages.dayHeadingPrefix} ${label} · ${SITE_NAME}`,
          description: dayDescription(route, label, true),
          inLanguage: NEWS_IN_LANGUAGE[route],
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb
        items={[
          { label: messages.breadcrumbHome, href: "/" },
          { label: messages.heading, href: `${base}/` },
          { label },
        ]}
      />

      <header className="mt-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {messages.dayHeadingPrefix} {label}
          </h1>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          {formatCountIn(total, route)} {total === 1 ? messages.dayCountWordSingular : messages.dayCountWordPlural}
        </p>
        <NewsPageLinks route={route} />
      </header>

      <NewsDayList
        hours={archive.hours}
        total={total}
        relevantTotal={archive.relevantTotal}
        fixedLanguage={route}
        previous={archive.previous}
        next={archive.next}
        archiveBase={base}
      />
    </div>
  );
}

/** The one-line description of a day page, for the meta tag (long) and the JSON-LD (short). */
export function dayDescription(route: NewsLanguage, label: string, short: boolean): string {
  if (route === "nl") {
    return short
      ? `Nieuwsberichten van ${label} over de Nederlandse rijksoverheid.`
      : `Alle nieuwsberichten van ${label} over de Nederlandse rijksoverheid, per uur, met bron en gekoppelde entiteiten.`;
  }
  return short
    ? `News items about the Dutch national government from ${label}.`
    : `All news items about the Dutch national government from ${label}, by hour, with source and linked entities.`;
}
