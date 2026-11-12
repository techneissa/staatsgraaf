import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { NewsExplorer } from "@/components/news/news-explorer";
import { InfoTip } from "@/components/info-tip";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { buildNewsExplorerGroups, NEWS_IN_LANGUAGE, newsRouteBase } from "@/lib/news-page";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import type { NewsLanguage } from "@/lib/types";

const tipLinkClass =
  "inline-flex min-h-6 items-center text-accent-text underline underline-offset-2 hover:no-underline pointer-coarse:min-h-11";

/**
 * The news list in one language. Both routes (/nieuws/ and /news/) render this, so they
 * show the same sections, controls and counts; only the strings differ. The wrapper
 * names the language of the page for screen readers and translation tools.
 */
export function NewsMainView({ route }: { route: NewsLanguage }) {
  const messages = NEWS_MESSAGES[route];
  const base = newsRouteBase(route);
  const { groups, initialVisible } = buildNewsExplorerGroups(route, base);
  const sourcesHref = route === "nl" ? "/nieuws/bronnen/" : "/news/sources/";
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

      <header className="mt-3 flex items-center gap-2 border-b border-line pb-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{messages.heading}</h1>
        <InfoTip label={NEWS_DICT.newsInfoLabel[route]}>
          <ul className="m-0 list-none space-y-0.5 p-0">
            <li>
              <Link href={sourcesHref} className={tipLinkClass}>
                {NEWS_DICT.newsSourcesLink[route]}
              </Link>
            </li>
            <li>
              <a href="/methodiek/#machinevertaling" className={tipLinkClass}>
                {NEWS_DICT.newsTranslatedMethodLink[route]}
              </a>
            </li>
          </ul>
        </InfoTip>
      </header>

      <section className="py-3">
        <NewsExplorer groups={groups} initialVisible={initialVisible} fixedLanguage={route} archiveBase={base} />
      </section>
    </div>
  );
}
