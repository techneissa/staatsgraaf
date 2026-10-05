import { L } from "@/components/i18n/t";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { NewsDayList } from "@/components/news/news-day-list";
import { NewsPageLinks } from "@/components/news/news-links";
import { getDatasetDate } from "@/lib/data";
import { LocalCount } from "@/components/content/local-date";
import { getNewsDays } from "@/lib/news";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { NT } from "@/components/news/news-t";
import { T } from "@/components/i18n/t";
import { buildNewsDayArchive, formatNewsDayLabel } from "@/lib/news-page";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";
export const dynamicParams = false;

const messages = NEWS_MESSAGES.nl;

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
  const label = formatNewsDayLabel(date, "nl");
  return pageMetadata({
    title: `${messages.dayHeadingPrefix} ${label}`,
    description: `Alle nieuwsberichten van ${label} over de Nederlandse rijksoverheid, per uur, met bron en gekoppelde entiteiten.`,
    path: `/nieuws/${date}/`,
    snapshotDate: getDatasetDate(),
  });
}

export default async function NewsDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!getNewsDays().some((day) => day.date === date)) notFound();

  const archive = buildNewsDayArchive(date, "nl");
  const label = formatNewsDayLabel(date, "nl");
  const total = archive.set.length;
  const pageUrl = absoluteUrl(`/nieuws/${date}/`);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${messages.dayHeadingPrefix} ${label} · ${SITE_NAME}`,
          description: `Nieuwsberichten van ${label} over de Nederlandse rijksoverheid.`,
          inLanguage: "nl-NL",
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb
        items={[
          { label: <NT k="breadcrumbHome" />, href: "/" },
          { label: <NT k="heading" />, href: "/nieuws/" },
          { label },
        ]}
      />

      <header className="mt-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            <NT k="dayHeadingPrefix" /> {label}
          </h1>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          <LocalCount value={total} />{" "}
          {total === 1 ? <NT k="dayCountWordSingular" /> : <NT k="dayCountWordPlural" />}
        </p>
        <NewsPageLinks route="nl" />
        <p className="mt-1 text-xs text-ink-faint">
          <a href="/methodiek/#machinevertaling" className="underline decoration-line underline-offset-2 hover:text-ink">
            <L nl="Anderstalige berichten zijn automatisch vertaald." en="Items in another language are machine translated." />
          </a>
        </p>
      </header>

      <NewsDayList
        hours={archive.hours}
        total={total}
        relevantTotal={archive.relevantTotal}
        previous={archive.previous}
        next={archive.next}
        archiveBase="/nieuws"
      />
    </>
  );
}
