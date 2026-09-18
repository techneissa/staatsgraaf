import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { ResponsibleList } from "@/components/topic/responsible-list";
import { TopicNews } from "@/components/topic/topic-news";
import { canonical, SITE_NAME } from "@/lib/site";
import { getTopicBySlug, getTopicNews, getTopics } from "@/lib/topics";

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
  return {
    title: topic.name,
    description,
    alternates: canonical(`/onderwerpen/${topic.slug}/`),
    openGraph: { title: topic.name, description },
  };
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);
  if (!topic) notFound();

  const news = getTopicNews(topic);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${topic.name} · ${SITE_NAME}`,
          ...(topic.description !== null ? { description: topic.description } : {}),
        }}
      />

      <Breadcrumb
        items={[
          { label: "NL Overheid Graph", href: "/" },
          { label: "Onderwerpen", href: "/onderwerpen/" },
          { label: topic.name },
        ]}
      />

      <header className="mt-4 border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{topic.name}</h1>
        {topic.description !== null ? (
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
            {topic.description}
          </p>
        ) : (
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-faint">
            Voor dit onderwerp is nog geen beschrijving opgenomen.
          </p>
        )}
      </header>

      <ResponsibleList topic={topic} />

      <section aria-labelledby="nieuws-titel" className="py-6">
        <h2 id="nieuws-titel" className="text-lg font-semibold tracking-tight text-ink">
          Nieuws
        </h2>
        <TopicNews items={news} />
      </section>
    </>
  );
}
