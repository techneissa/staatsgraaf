import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { EmptyState } from "@/components/empty-state";
import { getDatasetDate } from "@/lib/data";
import { formatCountIn } from "@/lib/format";
import { getNewsOutlets } from "@/lib/news";
import { NEWS_MESSAGES, licenseLabel } from "@/lib/news-i18n";
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
        </div>
      </header>

      <section className="py-6">
        {outlets.length === 0 ? (
          <EmptyState title={messages.sourcesEmpty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{messages.sourcesHeading}</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {messages.sourcesTablePublisher}
                  </th>
                  <th scope="col" className="hidden py-2 pr-3 font-medium sm:table-cell">
                    {messages.sourcesTableKind}
                  </th>
                  <th scope="col" className="hidden py-2 pr-3 font-medium sm:table-cell">
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
                      <span className="mt-0.5 block text-xs font-normal text-ink-faint sm:hidden">
                        {messages.kindLabels[outlet.kind]} · {outlet.languages.map((language) => messages.languageLabels[language]).join(", ")}
                      </span>
                    </th>
                    <td className="hidden py-2 pr-3 text-ink-muted sm:table-cell">{messages.kindLabels[outlet.kind]}</td>
                    <td className="hidden py-2 pr-3 text-ink-muted sm:table-cell">
                      {outlet.languages.map((language) => messages.languageLabels[language]).join(", ")}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink-muted">
                      {formatCountIn(outlet.count, "en")}
                    </td>
                    <td className="py-2 text-ink-muted">
                      {outlet.licenses.length > 0 ? outlet.licenses.map((license) => licenseLabel(license, "en")).join(", ") : messages.licenseNone}
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
