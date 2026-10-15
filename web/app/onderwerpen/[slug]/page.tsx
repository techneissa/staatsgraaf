import { LocalizedDescription } from "@/components/entity/localized-description";
import { englishDescription } from "@/lib/description-translations";
import { topicNameEn } from "@/lib/topic-names";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { L, T } from "@/components/i18n/t";
import { ShareButton } from "@/components/share-button";
import { SourceList } from "@/components/source-list";
import { ResponsibleList } from "@/components/topic/responsible-list";
import { TopicNews } from "@/components/topic/topic-news";
import { getDatasetDate } from "@/lib/data";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import { countTopicNews, getTopicBySlug, getTopicNews, getTopics } from "@/lib/topics";

export const dynamicParams = false;

export function generateStaticParams() {
  return getTopics().map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);
  if (!topic) return {};
  const description =
    topic.description ??
    `Wie is verantwoordelijk voor ${topic.name}? Organisaties en posities uit de Nederlandse rijksoverheid, met een bron per gegeven.`;
  return pageMetadata({
    title: topic.name,
    description,
    path: `/onderwerpen/${topic.slug}/`,
    snapshotDate: getDatasetDate(),
  });
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);
  if (!topic) notFound();

  const news = getTopicNews(topic);
  const newsTotal = countTopicNews(topic);
  const pageUrl = absoluteUrl(`/onderwerpen/${topic.slug}/`);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${topic.name} · ${SITE_NAME}`,
          ...(topic.description !== null ? { description: topic.description } : {}),
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb
        items={[
          { label: SITE_NAME, href: "/" },
          { label: <T area="common" k="navTopics" />, href: "/onderwerpen/" },
          { label: <L nl={topic.name} en={topicNameEn(topic.slug, topic.name)} /> },
        ]}
      />

      <header className="mt-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            <L nl={topic.name} en={topicNameEn(topic.slug, topic.name)} />
          </h1>
          <ShareButton compact title={topic.name} />
        </div>
        {topic.description !== null ? (
          <LocalizedDescription
            nl={topic.description}
            en={englishDescription(topic.id, topic.description)}
            className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted"
          />
        ) : (
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-faint">
            <T area="news" k="topicDescriptionMissing" />
          </p>
        )}
      </header>

      <ResponsibleList topic={topic} />

      {topic.sources !== undefined && topic.sources.length > 0 ? (
        <SourceList sources={topic.sources} />
      ) : null}

      <section aria-labelledby="nieuws-titel" className="py-6">
        <h2 id="nieuws-titel" className="text-lg font-semibold tracking-tight text-ink">
          <T area="news" k="topicNewsHeading" />
        </h2>
        <TopicNews items={news} total={newsTotal} />
      </section>
    </>
  );
}
