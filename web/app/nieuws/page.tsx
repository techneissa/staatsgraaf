import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { NewsExplorer } from "@/components/news/news-explorer";
import { getDatasetDate } from "@/lib/data";
import { formatCount, formatDate } from "@/lib/format";
import { getNewsCount } from "@/lib/news";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { buildNewsExplorerGroups } from "@/lib/news-page";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";

const messages = NEWS_MESSAGES.nl;

export const metadata: Metadata = pageMetadata({
  title: messages.metaTitle,
  description: messages.metaDescription,
  path: "/nieuws/",
  snapshotDate: getDatasetDate(),
});

export default function NewsPage() {
  const { groups, initialVisible } = buildNewsExplorerGroups("nl", "/nieuws");
  const datasetDate = getDatasetDate();
  const total = getNewsCount();
  const pageUrl = absoluteUrl("/nieuws/");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${messages.heading} · ${SITE_NAME}`,
          description: messages.metaDescription,
          inLanguage: "nl-NL",
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb
        items={[{ label: messages.breadcrumbHome, href: "/" }, { label: messages.heading }]}
      />

      <header className="mt-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{messages.heading}</h1>
          <Link
            href={messages.otherLanguageHref}
            className="text-sm text-accent-text underline-offset-2 hover:underline"
          >
            {messages.otherLanguageLabel}
          </Link>
        </div>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">{messages.intro}</p>
        <p className="mt-2 text-xs text-ink-faint">
          {formatCount(total)}{" "}
          {total === 1 ? messages.itemsWordSingular : messages.itemsWordPlural}
          {datasetDate !== null ? ` · bijgewerkt ${formatDate(datasetDate)}` : null}
        </p>
      </header>

      <section aria-label={messages.heading} className="py-6">
        <NewsExplorer
          groups={groups}
          initialVisible={initialVisible}
          messages={messages}
          initialLanguage="nl"
          archiveBase="/nieuws"
        />
      </section>
    </>
  );
}
