import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { EmptyState } from "@/components/empty-state";
import { JsonLd } from "@/components/json-ld";
import { NewsPageLinks } from "@/components/news/news-links";
import { getDatasetDate } from "@/lib/data";
import { formatCountIn } from "@/lib/format";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { interpolate } from "@/lib/i18n/locales";
import { getAllNews, getNewsOutlets, newsDayKey } from "@/lib/news";
import { getNewsFeedRegistry } from "@/lib/news-feeds";
import { GAP_TEXT_EN, licenseLabel, NEWS_MESSAGES } from "@/lib/news-i18n";
import { formatNewsDayLabel, NEWS_IN_LANGUAGE, newsRouteBase } from "@/lib/news-page";
import { buildSourceRows, type NewsSourceRow } from "@/lib/news-sources";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import type { NewsLanguage } from "@/lib/types";

const LINK = "gap-1 text-accent-text underline-offset-2 hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center";

/** The news list filtered on one outlet; with "show all" when none of its items names the state. */
function outletListHref(base: string, row: NewsSourceRow): string {
  const query = `bron=${encodeURIComponent(row.publisher)}${row.relevant === 0 ? "&alles=1" : ""}`;
  return `${base}/?${query}`;
}

/**
 * The outlet list in one language, shared by /nieuws/bronnen/ and /news/sources/ (ADR 0007
 * points 1 and 8): per publisher its website, a link to its items, kind, language, item
 * count, items that name the state, licence note and feed status from the registry, and the
 * named gaps (feeds that could not be verified) below.
 */
export function NewsSourcesView({ route }: { route: NewsLanguage }) {
  const messages = NEWS_MESSAGES[route];
  const base = newsRouteBase(route);
  const registry = getNewsFeedRegistry();
  const { rows, gaps } = buildSourceRows(getAllNews(), registry.feeds, registry.gaps);
  const recorded = new Map(getNewsOutlets().map((outlet) => [outlet.publisher, outlet.licenses]));
  const disabled = rows.filter((row) => row.feed !== null && !row.feed.enabled);
  const datasetDate = getDatasetDate();
  const pageUrl = absoluteUrl(`${base}/${route === "nl" ? "bronnen" : "sources"}/`);
  const date = (iso: string) => formatNewsDayLabel(iso, route);
  const dict = NEWS_DICT;

  return (
    <div lang={route}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${messages.sourcesHeading} · ${SITE_NAME}`,
          description: messages.sourcesIntro,
          inLanguage: NEWS_IN_LANGUAGE[route],
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
          ...(datasetDate !== null ? { dateModified: datasetDate } : {}),
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: rows.length,
            itemListElement: rows.map((row, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "NewsMediaOrganization",
                name: row.publisher,
                ...(row.site !== null ? { url: row.site } : {}),
              },
            })),
          },
        }}
      />

      <Breadcrumb
        items={[
          { label: messages.breadcrumbHome, href: "/" },
          { label: messages.heading, href: `${base}/` },
          { label: messages.sourcesHeading },
        ]}
      />

      <header className="mt-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{messages.sourcesHeading}</h1>
        </div>
        <p className="mt-3 max-w-prose text-sm text-ink-muted">{dict.newsSourcesIntro[route]}</p>
        <NewsPageLinks route={route} />
      </header>

      {rows.length === 0 ? (
        <section className="py-6">
          <EmptyState title={messages.sourcesEmpty} />
        </section>
      ) : (
        <section aria-labelledby="bronnen-uitgevers" className="py-6">
          <h2 id="bronnen-uitgevers" className="text-lg font-semibold tracking-tight text-ink">
            {dict.newsSourcesPublishersHeading[route]}
          </h2>
          <ul className="mt-4 grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
            {rows.map((row) => {
              const licences = [...new Set([...(recorded.get(row.publisher) ?? []), ...(row.feed?.license ? [row.feed.license] : [])])];
              return (
                <li key={row.publisher} className="min-w-0 rounded-md border border-line bg-surface p-4">
                  <h3 className="text-base font-semibold text-ink">
                    {row.count > 0 ? (
                      <Link href={outletListHref(base, row)} className="underline-offset-2 hover:text-accent-text hover:underline">
                        {row.publisher}
                      </Link>
                    ) : (
                      row.publisher
                    )}
                  </h3>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {messages.kindLabels[row.kind]} · {row.languages.map((language) => messages.languageLabels[language]).join(", ")}
                  </p>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-ink-faint">{dict.newsSourcesCountLabel[route]}</dt>
                      <dd className="tabular-nums text-ink">{formatCountIn(row.count, route)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-faint">{dict.newsSourcesRelevantLabel[route]}</dt>
                      <dd className="tabular-nums text-ink">{formatCountIn(row.relevant, route)}</dd>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <dt className="text-xs text-ink-faint">{dict.newsSourcesLatestLabel[route]}</dt>
                      <dd className="tabular-nums text-ink">
                        {row.latest !== null ? <time dateTime={row.latest}>{date(newsDayKey(row.latest))}</time> : "-"}
                      </dd>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <dt className="text-xs text-ink-faint">{dict.newsSourcesLicenseLabel[route]}</dt>
                      <dd className="text-ink-muted">
                        {licences.length > 0 ? licences.map((value) => licenseLabel(value, route)).join("; ") : messages.licenseNone}
                      </dd>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <dt className="text-xs text-ink-faint">{dict.newsSourcesFeedLabel[route]}</dt>
                      <dd className="text-ink-muted">
                        {row.feed === null ? (
                          dict.newsSourcesNoFeed[route]
                        ) : (
                          <>
                            <span className={row.feed.enabled ? "font-medium text-ink" : "font-medium text-ink"}>
                              {row.feed.enabled ? dict.newsSourcesFeedOn[route] : dict.newsSourcesFeedOff[route]}
                            </span>
                            {row.feed.retrieved !== null ? (
                              <>
                                {" · "}
                                {row.feed.status !== null
                                  ? interpolate(dict.newsSourcesFeedStatus[route], { status: String(row.feed.status), date: date(row.feed.retrieved) })
                                  : interpolate(dict.newsSourcesFeedChecked[route], { date: date(row.feed.retrieved) })}
                              </>
                            ) : null}
                            {row.feed.notes !== null ? (
                              <span lang="nl" className="mt-0.5 block text-xs text-ink-faint">
                                {dict.newsSourcesSourceNote[route]}: {row.feed.notes}
                              </span>
                            ) : null}
                          </>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                    {row.count > 0 ? (
                      <Link href={outletListHref(base, row)} className={LINK}>
                        {interpolate(dict.newsSourcesViewItems[route], { name: row.publisher })} <span aria-hidden="true">&rsaquo;</span>
                      </Link>
                    ) : null}
                    {row.site !== null ? (
                      <a href={row.site} target="_blank" rel="noopener noreferrer" className={LINK}>
                        {interpolate(dict.newsSourcesWebsite[route], { name: row.publisher })}
                        <span aria-hidden="true">&nbsp;&#8599;</span>
                        <span className="sr-only"> {messages.card.opensNewTab}</span>
                      </a>
                    ) : null}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="bronnen-feeds" className="border-t border-line py-6">
        <h2 id="bronnen-feeds" className="text-lg font-semibold tracking-tight text-ink">
          {dict.newsSourcesFeedsHeading[route]}
        </h2>
        <p className="mt-2 max-w-prose text-sm text-ink-muted">{dict.newsSourcesRegistryNote[route]}</p>
        {disabled.length + gaps.length > 0 ? (
          <ul className="mt-4 list-none space-y-3 p-0">
            {disabled.map((row) => (
              <li key={`feed-${row.publisher}`} className="rounded-md border border-dashed border-line bg-surface-inset p-4 text-sm">
                <p className="font-medium text-ink">
                  {dict.newsSourcesGapHeading[route]}: {row.publisher}
                </p>
                <p className="mt-1 text-ink-muted">
                  {dict.newsSourcesFeedOff[route]}
                  {row.feed?.status !== null && row.feed?.status !== undefined ? ` · HTTP ${row.feed.status}` : ""}
                  {row.feed?.notes ? (
                    <>
                      {" · "}
                      <span lang="nl">{row.feed.notes}</span>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
            {gaps.map((gap) => {
              const english = route === "en" ? GAP_TEXT_EN[gap.url] : undefined;
              const textLang = route === "en" && english === undefined ? "nl" : route;
              return (
                <li key={gap.url} className="rounded-md border border-dashed border-line bg-surface-inset p-4 text-sm">
                  <p className="font-medium text-ink">
                    {dict.newsSourcesGapHeading[route]}:{" "}
                    <a href={gap.url} target="_blank" rel="noopener noreferrer" className={LINK}>
                      {gap.url}
                      <span className="sr-only"> {messages.card.opensNewTab}</span>
                    </a>
                  </p>
                  <p lang={textLang} className="mt-2 break-words text-ink-muted">
                    <span className="font-medium">{dict.newsSourcesGapWhy[route]}:</span> {english?.why ?? gap.why}
                  </p>
                  <p lang={textLang} className="mt-1 break-words text-ink-muted">
                    <span className="font-medium">{dict.newsSourcesGapResume[route]}:</span> {english?.resume ?? gap.resume}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
