import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { NewsDayList } from "@/components/news/news-day-list";
import { NewsPageLinks } from "@/components/news/news-links";
import { getDatasetDate } from "@/lib/data";
import { formatCountIn } from "@/lib/format";
import { getNewsDays } from "@/lib/news";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { buildNewsDayArchive, formatNewsDayLabel } from "@/lib/news-page";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";
export const dynamicParams = false;

const messages = NEWS_MESSAGES.en;

export function generateStaticParams() {
  return getNewsDays().map((day) => ({ date: day.date }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  if (!getNewsDays().some((day) => day.date === date)) return {};
  const label = formatNewsDayLabel(date, "en");
  const base = pageMetadata({
    title: `${messages.dayHeadingPrefix} ${label}`,
    description: `All news items about the Dutch national government from ${label}, by hour, with source and linked entities.`,
    path: `/news/${date}/`,
    snapshotDate: getDatasetDate(),
  });
  return { ...base, openGraph: { ...(base.openGraph ?? {}), locale: "en_GB" } };
}

export default async function NewsDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!getNewsDays().some((day) => day.date === date)) notFound();

  const archive = buildNewsDayArchive(date, "en");
  const label = formatNewsDayLabel(date, "en");
  const total = archive.set.length;
  const pageUrl = absoluteUrl(`/news/${date}/`);

  return (
    <div lang="en">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${messages.dayHeadingPrefix} ${label} · ${SITE_NAME}`,
          description: `News items about the Dutch national government from ${label}.`,
          inLanguage: "en",
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb
        items={[
          { label: messages.breadcrumbHome, href: "/" },
          { label: messages.heading, href: "/news/" },
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
          {formatCountIn(total, "en")}{" "}
          {total === 1 ? messages.dayCountWordSingular : messages.dayCountWordPlural}
        </p>
        <NewsPageLinks route="en" />
        <p className="mt-1 text-xs text-ink-faint">
          <a href="/methodiek/#machinevertaling" className="underline decoration-line underline-offset-2 hover:text-ink">
            {messages.card.translationNote}
          </a>
        </p>
      </header>

      <NewsDayList
        hours={archive.hours}
        total={total}
        relevantTotal={archive.relevantTotal}
        fixedLanguage="en"
        previous={archive.previous}
        next={archive.next}
        archiveBase="/news"
      />
    </div>
  );
}
