import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { NewsExplorer } from "@/components/news/news-explorer";
import { getDatasetDate } from "@/lib/data";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { buildNewsExplorerGroups, formatNewsDayLabel } from "@/lib/news-page";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";

const messages = NEWS_MESSAGES.en;

const baseMetadata = pageMetadata({
  title: messages.metaTitle,
  description: messages.metaDescription,
  path: "/news/",
  snapshotDate: getDatasetDate(),
});

export const metadata: Metadata = {
  ...baseMetadata,
  openGraph: { ...(baseMetadata.openGraph ?? {}), locale: "en_GB" },
};

export default function NewsPage() {
  const { groups, initialVisible } = buildNewsExplorerGroups("en", "/news");
  const datasetDate = getDatasetDate();
  const pageUrl = absoluteUrl("/news/");

  return (
    <div lang="en">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${messages.heading} · ${SITE_NAME}`,
          description: messages.metaDescription,
          inLanguage: "en",
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
        {datasetDate !== null ? (
          <p className="mt-2 text-xs text-ink-faint">updated {formatNewsDayLabel(datasetDate, "en")}</p>
        ) : null}
      </header>

      <section className="py-6">
        <NewsExplorer
          groups={groups}
          initialVisible={initialVisible}
          fixedLanguage="en"
          archiveBase="/news"
        />
      </section>
    </div>
  );
}
