import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { TopicCard } from "@/components/topic/topic-card";
import { canonical, SITE_NAME } from "@/lib/site";
import { countResponsibleOrganizations, getTopics } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Onderwerpen",
  description:
    "Cross-cutting onderwerpen in de Nederlandse rijksoverheid, elk met de organisaties en posities die verantwoordelijk zijn en een bron per gegeven.",
  alternates: canonical("/onderwerpen/"),
};

export default function TopicsPage() {
  const topics = getTopics();
  const cards = topics.map((topic) => ({
    topic,
    organizationCount: countResponsibleOrganizations(topic),
  }));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Onderwerpen · ${SITE_NAME}`,
          description:
            "Cross-cutting onderwerpen in de Nederlandse rijksoverheid met verantwoordelijke organisaties.",
        }}
      />

      <Breadcrumb items={[{ label: "NL Overheid Graph", href: "/" }, { label: "Onderwerpen" }]} />

      <header className="mt-4 border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Onderwerpen</h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
          Onderwerpen doorsnijden de begrotingen en organisaties. Elk onderwerp toont wie er
          verantwoordelijk is: de ministeries, uitvoeringsorganisaties, adviesorganen en posities die
          de dataset aan het onderwerp koppelt.
        </p>
      </header>

      <section aria-labelledby="onderwerpen-titel" className="py-6">
        <h2 id="onderwerpen-titel" className="text-lg font-semibold tracking-tight text-ink">
          Alle onderwerpen
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {topics.length} onderwerpen met elk het aantal verantwoordelijke organisaties.
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
          <p className="mt-4 text-sm text-ink-faint">Nog geen onderwerpen in de dataset.</p>
        )}
      </section>
    </>
  );
}
