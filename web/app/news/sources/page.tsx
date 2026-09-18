import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { EmptyState } from "@/components/empty-state";
import { getDatasetDate } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { getNewsOutlets } from "@/lib/news";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { pageMetadata } from "@/lib/site";

export const dynamic = "force-static";

const messages = NEWS_MESSAGES.en;

const baseMetadata = pageMetadata({
  title: messages.sourcesHeading,
  description: messages.sourcesIntro,
  path: "/news/sources/",
  snapshotDate: getDatasetDate(),
});

export const metadata: Metadata = {
  ...baseMetadata,
  openGraph: { ...(baseMetadata.openGraph ?? {}), locale: "en_GB" },
};

export default function NewsSourcesPage() {
  const outlets = getNewsOutlets();

  return (
    <div lang="en">
      <Breadcrumb
        items={[
          { label: messages.breadcrumbHome, href: "/" },
          { label: messages.heading, href: "/news/" },
          { label: messages.sourcesHeading },
        ]}
      />

      <header className="mt-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {messages.sourcesHeading}
          </h1>
          <Link
            href={messages.otherLanguageHref}
            className="text-sm text-accent-text underline-offset-2 hover:underline"
          >
            {messages.otherLanguageLabel}
          </Link>
        </div>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
          {messages.sourcesIntro}
        </p>
      </header>

      <section className="py-6">
        {outlets.length === 0 ? (
          <EmptyState title={messages.sourcesEmpty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{messages.sourcesHeading}</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {messages.sourcesTablePublisher}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {messages.sourcesTableKind}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {messages.sourcesTableLanguages}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    {messages.sourcesTableCount}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {messages.sourcesTableLicense}
                  </th>
                </tr>
              </thead>
              <tbody>
                {outlets.map((outlet) => (
                  <tr key={outlet.publisher} className="border-b border-line align-top">
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-ink">
                      {outlet.publisher}
                    </th>
                    <td className="py-2 pr-3 text-ink-muted">{messages.kindLabels[outlet.kind]}</td>
                    <td className="py-2 pr-3 text-ink-muted">
                      {outlet.languages.map((language) => messages.languageLabels[language]).join(", ")}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink-muted">
                      {formatCount(outlet.count)}
                    </td>
                    <td className="py-2 text-ink-muted">
                      {outlet.licenses.length > 0 ? outlet.licenses.join(", ") : messages.licenseNone}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
