import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { NewsExplorer } from "@/components/news/news-explorer";
import { NewsPageLinks } from "@/components/news/news-links";
import { getDatasetDate } from "@/lib/data";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { interpolate } from "@/lib/i18n/locales";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { buildNewsExplorerGroups, formatNewsDayLabel, NEWS_IN_LANGUAGE, newsRouteBase } from "@/lib/news-page";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import type { NewsLanguage } from "@/lib/types";

/**
 * The news list in one language. Both routes (/nieuws/ and /news/) render this, so they
 * show the same sections, controls and counts; only the strings differ. The wrapper
 * names the language of the page for screen readers and translation tools.
 */
export function NewsMainView({ route }: { route: NewsLanguage }) {
  const messages = NEWS_MESSAGES[route];
  const base = newsRouteBase(route);
  const { groups, initialVisible } = buildNewsExplorerGroups(route, base);
  const datasetDate = getDatasetDate();
  const pageUrl = absoluteUrl(`${base}/`);

  return (
    <div lang={route}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${messages.heading} · ${SITE_NAME}`,
          description: messages.metaDescription,
          inLanguage: NEWS_IN_LANGUAGE[route],
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb items={[{ label: messages.breadcrumbHome, href: "/" }, { label: messages.heading }]} />

      <header className="mt-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{messages.heading}</h1>
        </div>
        <NewsPageLinks route={route} />
        {datasetDate !== null ? (
          <p className="mt-2 text-xs text-ink-faint">
            {interpolate(NEWS_DICT.newsUpdated[route], { date: formatNewsDayLabel(datasetDate, route) })}
          </p>
        ) : null}
      </header>

      <section className="py-6">
        <NewsExplorer groups={groups} initialVisible={initialVisible} fixedLanguage={route} archiveBase={base} />
      </section>
    </div>
  );
}
