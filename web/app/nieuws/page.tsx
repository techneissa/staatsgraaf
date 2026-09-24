import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { NewsExplorer } from "@/components/news/news-explorer";
import { L } from "@/components/i18n/t";
import { getDatasetDate } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { getNewsCount } from "@/lib/news";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { NT, NTKind, NTLanguage } from "@/components/news/news-t";
import { buildNewsExplorerGroups, formatNewsDayLabel } from "@/lib/news-page";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";

const messages = NEWS_MESSAGES.nl;
const en = NEWS_MESSAGES.en;

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
        items={[
          { label: <NT k="breadcrumbHome" />, href: "/" },
          { label: <L nl={messages.heading} en={en.heading} /> },
        ]}
      />

      <header className="mt-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            <L nl={messages.heading} en={en.heading} />
          </h1>
          <Link
            href={messages.otherLanguageHref}
            className="text-sm text-accent-text underline-offset-2 hover:underline"
          >
            <L nl={messages.otherLanguageLabel} en="English page" />
          </Link>
        </div>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
          <L nl={messages.intro} en={en.intro} />
        </p>
        <p className="mt-2 text-xs text-ink-faint">
          {formatCount(total)}{" "}
          {total === 1 ? (
            <L nl={messages.itemsWordSingular} en={en.itemsWordSingular} />
          ) : (
            <L nl={messages.itemsWordPlural} en={en.itemsWordPlural} />
          )}
          {datasetDate !== null ? (
            <>
              {" · "}
              <L nl="bijgewerkt" en="updated" /> {formatNewsDayLabel(datasetDate, "nl")}
            </>
          ) : null}
        </p>
      </header>

      <section aria-label={messages.heading} className="py-6">
        <NewsExplorer
          groups={groups}
          initialVisible={initialVisible}
          archiveBase="/nieuws"
        />
      </section>
    </>
  );
}
