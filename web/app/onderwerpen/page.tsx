import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { T } from "@/components/i18n/t";
import { TopicCard } from "@/components/topic/topic-card";
import { getDatasetDate } from "@/lib/data";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import { countResponsibleOrganizations, getTopics } from "@/lib/topics";

export const metadata: Metadata = pageMetadata({
  title: "Onderwerpen",
  description:
    "Onderwerpen die doorsnijden wat de Nederlandse rijksoverheid doet, elk met de organisaties en posities die verantwoordelijk zijn en een bron per gegeven.",
  path: "/onderwerpen/",
  snapshotDate: getDatasetDate(),
});

export default function TopicsPage() {
  const topics = getTopics();
  const cards = topics.map((topic) => ({
    topic,
    organizationCount: countResponsibleOrganizations(topic),
  }));
  const pageUrl = absoluteUrl("/onderwerpen/");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Onderwerpen · ${SITE_NAME}`,
          description:
            "Onderwerpen die doorsnijden wat de Nederlandse rijksoverheid doet, met verantwoordelijke organisaties.",
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: "Onderwerpen" }]} />
      <header className="mt-4 border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          <T area="news" k="topicsHeading" />
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
          <T area="news" k="topicsIntro" />
        </p>
      </header>

      <section aria-labelledby="onderwerpen-titel" className="py-6">
        <h2 id="onderwerpen-titel" className="text-lg font-semibold tracking-tight text-ink">
          <T area="news" k="topicsAllHeading" />
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {topics.length} <T area="news" k="topicsAllCaption" />
        </p>
        {cards.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {cards.map(({ topic, organizationCount }) => (
              <li key={topic.id}>
                <TopicCard topic={topic} organizationCount={organizationCount} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-faint">
            <T area="news" k="topicsEmpty" />
          </p>
        )}
      </section>
    </>
  );
}
