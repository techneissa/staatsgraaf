import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { EmptyState } from "@/components/empty-state";
import { getDatasetDate } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { getNewsOutlets } from "@/lib/news";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { NT, NTKind, NTLanguage } from "@/components/news/news-t";
import { L } from "@/components/i18n/t";
import { pageMetadata } from "@/lib/site";

export const dynamic = "force-static";

const messages = NEWS_MESSAGES.nl;

export const metadata: Metadata = pageMetadata({
  title: messages.sourcesHeading,
  description: messages.sourcesIntro,
  path: "/nieuws/bronnen/",
  snapshotDate: getDatasetDate(),
});

export default function NewsSourcesPage() {
  const outlets = getNewsOutlets();

  return (
    <>
      <Breadcrumb
        items={[
          { label: <NT k="breadcrumbHome" />, href: "/" },
          { label: <NT k="heading" />, href: "/nieuws/" },
          { label: <NT k="sourcesHeading" /> },
        ]}
      />

      <header className="mt-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            <NT k="sourcesHeading" />
          </h1>
          <Link
            href={messages.otherLanguageHref}
            className="text-sm text-accent-text underline-offset-2 hover:underline"
          >
            <L nl={messages.otherLanguageLabel} en="English page" />
          </Link>
        </div>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
          <NT k="sourcesIntro" />
        </p>
      </header>

      <section className="py-6">
        {outlets.length === 0 ? (
          <EmptyState title={messages.sourcesEmpty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only"><NT k="sourcesHeading" /></caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    <NT k="sourcesTablePublisher" />
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    <NT k="sourcesTableKind" />
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    <NT k="sourcesTableLanguages" />
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    <NT k="sourcesTableCount" />
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    <NT k="sourcesTableLicense" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {outlets.map((outlet) => (
                  <tr key={outlet.publisher} className="border-b border-line align-top">
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-ink">
                      {outlet.publisher}
                    </th>
                    <td className="py-2 pr-3 text-ink-muted"><NTKind kind={outlet.kind} /></td>
                    <td className="py-2 pr-3 text-ink-muted">
                      {outlet.languages.map((language, index) => (
                        <span key={language}>
                          {index > 0 ? ", " : null}
                          <NTLanguage language={language} />
                        </span>
                      ))}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink-muted">
                      {formatCount(outlet.count)}
                    </td>
                    <td className="py-2 text-ink-muted">
                      {outlet.licenses.length > 0 ? outlet.licenses.join(", ") : <NT k="licenseNone" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
