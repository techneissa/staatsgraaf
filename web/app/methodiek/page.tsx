import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/breadcrumb";
import { L, T } from "@/components/i18n/t";
import { getDataset } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { getS } from "@/lib/i18n/server-strings";
import { canonical, SITE_NAME } from "@/lib/site";

/**
 * Build-time SEO stays Dutch by design: pageMetadata copy is build-time only.
 */
export const metadata: Metadata = {
  title: getS("pages", "methodTitle"),
  description:
    "Over Staatsgraaf: waarom het bestaat, waar de gegevens vandaan komen, hoe ze actueel blijven en waar AI is gebruikt.",
  alternates: canonical("/methodiek/"),
};

function Section({ id, title, children }: { id: string; title: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-titel`} id={id} className="scroll-mt-4 border-b border-line py-6 last:border-b-0">
      <h2 id={`${id}-titel`} className="text-lg font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <div className="mt-2 max-w-prose space-y-3 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

const LINK = "text-accent-text underline-offset-2 hover:underline";

export default function MethodPage() {
  const { people } = getDataset();
  const withPortrait = people.filter((person) => person.portrait !== null).length;

  return (
    <>
      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: <T area="pages" k="methodTitle" /> }]} />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        <T area="pages" k="methodTitle" />
      </h1>

      <div className="mt-2">
        <Section id="over" title={<L nl="Over dit project" en="About this project" />}>
          <p>
            <L
              nl="Staatsgraaf is een persoonlijk project. Ik bouw het voor mezelf en publiceer het voor iedereen die een algemeen beeld wil krijgen van hoe de Nederlandse overheid in elkaar zit: wie welke functie heeft, welke organisaties er zijn, wat er aan beleid en regelgeving verandert en wat het nieuws erover zegt."
              en="Staatsgraaf is a personal project. I build it for myself and publish it for anyone who wants a general picture of how the Dutch government works: who holds which office, which organisations exist, what changes in policy and regulation, and what the news says about it."
            />
          </p>
          <p>
            <L
              nl="De inhoud is zo neutraal mogelijk: feiten uit officiële en openbare bronnen, zonder oordeel, met bij elk gegeven de bron."
              en="The content aims to be as neutral as possible: facts from official and public sources, without judgement, with the source next to every fact."
            />
          </p>
          <p>
            <L nl="Geïnspireerd door de" en="Inspired by the" />{" "}
            <a href="https://graph.civlab.org/us" className={LINK} rel="noopener noreferrer">
              Gov Graph
            </a>{" "}
            <L nl="van" en="by" />{" "}
            <a href="https://www.civlab.org/" className={LINK} rel="noopener noreferrer">
              CivLab
            </a>
            .
          </p>
        </Section>

        <Section id="bronnen" title={<L nl="Bronnen" en="Sources" />}>
          <p>
            <L
              nl="Elk feit verwijst naar een bron, met de datum waarop die is opgehaald. Waar geen betrouwbare bron is, staat er niets ingevuld maar een benoemde leemte. Er wordt nooit een waarde geraden."
              en="Every fact points to a source, with the date it was retrieved. Where no reliable source exists, nothing is filled in; the gap is named instead. No value is ever guessed."
            />
          </p>
        </Section>

        <Section id="onderhoud" title={<L nl="Actualiteit" en="Freshness" />}>
          <p>
            <L
              nl="Bewindspersonen en de leden van beide Kamers worden elke nacht bijgewerkt uit de officiële lijsten. Nieuws wordt overdag elk uur opgehaald. Wijzigingen verschijnen in de wijzigingenfeed, elk met de bron die ze veroorzaakte."
              en="Ministers and the members of both chambers are updated every night from the official lists. News is fetched every hour during the day. Changes appear in the change feed, each with the source that caused it."
            />
          </p>
        </Section>

        <Section id="ai" title={<L nl="AI" en="AI" />}>
          <p>
            <L
              nl="Dit project is gebouwd met hulp van AI: de code, de gegevensverwerking en een deel van de teksten zijn met AI-assistenten gemaakt en daarna gecontroleerd."
              en="This project was built with the help of AI: the code, the data processing and some of the text were made with AI assistants and then checked."
            />
          </p>
          <p id="machinevertaling" className="scroll-mt-4">
            <L
              nl="Nieuwskoppen en inleidingen worden automatisch vertaald met een taalmodel. Een vertaling voegt niets toe, namen blijven Nederlands en het origineel is altijd één klik weg. Vertaalde berichten zijn als zodanig gemarkeerd."
              en="News headlines and leads are translated automatically by a language model. A translation adds nothing, names stay in Dutch and the original is always one click away. Translated items are marked as such."
            />
          </p>
        </Section>

        <Section id="correcties" title={<L nl="Correcties" en="Corrections" />}>
          <p>
            <L
              nl="Een gepubliceerd feit wordt niet stil aangepast: elke correctie wordt vastgelegd met de oude en de nieuwe waarde, de datum en de reden."
              en="A published fact is never changed silently: every correction is recorded with the old and the new value, the date and the reason."
            />
          </p>
        </Section>

        <Section id="licenties" title={<L nl="Licenties" en="Licences" />}>
          <p>
            <L
              nl="De code valt onder de MIT-licentie, de dataset onder CC BY 4.0. Portretten komen van de Tweede Kamer (CC0) en Wikimedia Commons (onder de licentie van elk bestand); de credit per foto staat in de dataset."
              en="The code is under the MIT licence, the dataset under CC BY 4.0. Portraits come from the Tweede Kamer (CC0) and Wikimedia Commons (under each file's licence); the credit per photo is in the dataset."
            />
          </p>
        </Section>

        <Section id="grenzen" title={<L nl="Wat nog ontbreekt" en="What is still missing" />}>
          <ul className="list-disc space-y-1.5 ps-5 marker:text-ink-faint">
            <li>
              <L nl="Portretten:" en="Portraits:" /> {formatCount(withPortrait)} <L nl="van" en="of" />{" "}
              {formatCount(people.length)}
              <L
                nl=". Wie geen vrij gelicentieerde foto heeft, krijgt initialen."
                en=". People without a freely licensed photo show initials."
              />
            </li>
            <li>
              <L
                nl="Geen van beide Kamers publiceert een zetel per lid. Leden staan daarom op naamvolgorde binnen hun fractie."
                en="Neither chamber publishes a seat per member, so members are placed in name order within their party group."
              />
            </li>
            <li>
              <L
                nl="Provincies, gemeenten en waterschappen hebben nog geen live bron en worden minder vaak bijgewerkt."
                en="Provinces, municipalities and water boards have no live source yet and are updated less often."
              />
            </li>
          </ul>
        </Section>
      </div>
    </>
  );
}
