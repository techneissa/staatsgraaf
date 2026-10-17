import type { Metadata } from "next";
import Link from "next/link";
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

      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: <T area="common" k="navTopics" /> }]} />
      <header className="mt-4 border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          <T area="news" k="topicsHeading" />
        </h1>
      </header>

      <section aria-labelledby="onderwerpen-titel" className="py-6">
        <h2 id="onderwerpen-titel" className="sr-only">
          <T area="news" k="topicsAllHeading" />
        </h2>
        {cards.length > 0 ? (
          <ul className="grid list-none grid-cols-1 gap-3 p-0 @[40rem]:grid-cols-2 @[64rem]:grid-cols-3">
            {cards.map(({ topic, organizationCount }) => (
              <li key={topic.id} className="min-w-0">
                <TopicCard topic={topic} organizationCount={organizationCount} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 flex flex-col items-start gap-2 text-sm">
            <p className="text-ink-faint">
              <T area="news" k="topicsEmpty" />
            </p>
            <Link href="/organisaties/" className="text-accent-text underline underline-offset-2 pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center">
              <T area="entity" k="idxTopicsEmptyNext" />
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
