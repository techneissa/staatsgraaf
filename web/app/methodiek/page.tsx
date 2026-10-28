import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CircleDashed, Info, Link as LinkGlyph, Scale, Sparkles, type IconNode } from "lucide";
import { Breadcrumb } from "@/components/breadcrumb";
import { SectionHeading } from "@/components/icons/section-heading";
import { L, T } from "@/components/i18n/t";
import { getS } from "@/lib/i18n/server-strings";
import { canonical, SITE_NAME } from "@/lib/site";

/**
 * Build-time SEO stays Dutch by design: pageMetadata copy is build-time only.
 */
export const metadata: Metadata = {
  title: getS("pages", "aboutTitle"),
  description:
    "Over Staatsgraaf: waarom het bestaat, waar de gegevens vandaan komen, hoe ze actueel blijven en waar AI is gebruikt.",
  alternates: canonical("/methodiek/"),
};

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: ReactNode;
  icon: IconNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-titel`} id={id} className="scroll-mt-4 border-b border-line py-6 last:border-b-0">
      <SectionHeading id={`${id}-titel`} icon={icon}>
        {title}
      </SectionHeading>
      <div className="mt-2 max-w-prose space-y-3 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

const LINK = "text-accent-text underline-offset-2 hover:underline";

export default function MethodPage() {
  return (
    <>
      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: <T area="pages" k="aboutTitle" /> }]} />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        <T area="pages" k="aboutTitle" />
      </h1>

      <div className="mt-2">
        <Section id="over" icon={Info} title={<L nl="Over dit project" en="About this project" />}>
          <p className="text-base font-medium text-ink">
            <L nl="De Nederlandse rijksoverheid in kaart" en="The Dutch national government, mapped" />
          </p>
          <p>
            <L nl="Staatsgraaf is een persoonlijk project. Het project is geïnspireerd door " en="Staatsgraaf is a personal project. The project is inspired by " />
            <a href="https://graph.civlab.org/us" className={LINK} target="_blank" rel="noopener noreferrer">
              <L nl="de Gov Graph van CivLab" en="CivLab's Gov Graph" />
            </a>
            .{" "}
            <L
              nl="Dank aan CivLab voor het idee. Staatsgraaf is niet verbonden aan CivLab en gebruikt er niets van. Het project is gemaakt voor mezelf en voor iedereen die een algemeen beeld wil van hoe de Nederlandse overheid werkt: wie welk ambt bekleedt, welke organisaties er zijn, wat er verandert in beleid en regelgeving, en wat het nieuws erover zegt."
              en="Thanks to CivLab for the idea. Staatsgraaf is not affiliated with CivLab and uses nothing from it. The project is created for myself and anyone who wants a general picture of how the Dutch government works: who holds which office, which organisations exist, what changes in policy and regulation, and what the news says about it."
            />
          </p>
          <p>
            <L
              nl="De feiten komen uit officiële en openbare bronnen. Ik beschrijf ze zo neutraal mogelijk, zonder oordeel."
              en="The facts come from official and public sources. I state them as neutrally as possible, without judgement."
            />{" "}
            <L nl="Waar ze vandaan komen staat bij " en="Where they come from is under " />
            <a href="#bronnen" className={LINK}>
              <L nl="Bronnen" en="Sources" />
            </a>
            <L nl="; onder welke voorwaarden je ze mag gebruiken bij " en="; what you may do with them is under " />
            <a href="#licenties" className={LINK}>
              <L nl="Licenties" en="Licences" />
            </a>
            .
          </p>
          <p className="font-medium text-danger">
            Staatsgraaf is{" "}
            <strong className="font-bold underline">
              <L nl="niet" en="not" />
            </strong>
            {" "}
            <L
              nl="verbonden aan de Nederlandse overheid of aan een ander overheidsorgaan."
              en="affiliated with the Dutch government or any government body."
            />
          </p>
        </Section>

        <Section id="bronnen" icon={LinkGlyph} title={<L nl="Bronnen" en="Sources" />}>
          <p>
            <L
              nl="Elk feit verwijst naar een bron, met de datum waarop die is opgehaald. Waar geen betrouwbare bron is, staat er niets ingevuld maar een benoemde leemte. Er wordt nooit een waarde geraden."
              en="Every fact points to a source, with the date it was retrieved. Where no reliable source exists, nothing is filled in; the gap is named instead. No value is ever guessed."
            />
          </p>
        </Section>

        <Section id="ai" icon={Sparkles} title={<L nl="AI" en="AI" />}>
          <p>
            <L
              nl="Dit project is gebouwd met hulp van AI: de code, de gegevensverwerking en een deel van de teksten zijn met AI-assistenten gemaakt en daarna gecontroleerd."
              en="This project was built with the help of AI: the code, the data processing and some of the text were made with AI assistants and then checked."
            />
          </p>
          <p id="machinevertaling" className="scroll-mt-4">
            <L
              nl="Nieuwskoppen en inleidingen worden automatisch vertaald met AI. Een vertaling voegt niets toe, namen blijven Nederlands en het origineel is altijd één klik weg. Vertaalde berichten zijn als zodanig gemarkeerd."
              en="News headlines and leads are translated automatically with AI. A translation adds nothing, names stay in Dutch and the original is always one click away. Translated items are marked as such."
            />
          </p>
        </Section>

        <Section id="licenties" icon={Scale} title={<L nl="Licenties" en="Licences" />}>
          <p>
            <L
              nl="De code is source-available onder de licentie CC BY-NC-SA 4.0 (niet-commercieel gebruik, met naamsvermelding en onder dezelfde licentie), de dataset onder CC BY 4.0. Portretten komen van de Tweede Kamer (CC0) en Wikimedia Commons (onder de licentie van elk bestand); de credit per foto staat in de dataset."
              en="The code is source-available under the CC BY-NC-SA 4.0 licence (noncommercial use, with credit and under the same licence), the dataset under CC BY 4.0. Portraits come from the Tweede Kamer (CC0) and Wikimedia Commons (under each file's licence); the credit per photo is in the dataset."
            />
          </p>
        </Section>

        <Section id="grenzen" icon={CircleDashed} title={<L nl="Wat nog ontbreekt" en="What is still missing" />}>
          <ul className="list-disc space-y-1.5 ps-5 marker:text-ink-faint">
            <li>
              <L
                nl="Niet elke persoon heeft een portret. Een foto staat er alleen als de licentie hergebruik toestaat. Anders toont de pagina initialen."
                en="Not every individual has a portrait. A photo is shown only when its licence allows reuse. Otherwise the page shows initials."
              />
            </li>
            <li>
              <L
                nl="Gemeenten, provincies en waterschappen komen uit officiële bronnen (TOOI, het Register van Overheidsorganisaties, CBS en Rijksoverheid) en worden automatisch bijgewerkt. Daarin staan de bestuursorganen, hun raadszetels, de burgemeesters, dijkgraven en commissarissen van de Koning. Wethouders, raadsleden, gedeputeerden en de besturen van waterschappen ontbreken nog."
                en="Municipalities, provinces and water boards come from official sources (TOOI, the Register of Government Organisations, CBS and Rijksoverheid) and are refreshed automatically. They include the bodies, their council seats, the mayors, dijkgraven and Commissioners of the King. Aldermen, councillors, gedeputeerden and water board councils are not in yet."
              />
            </li>
          </ul>
        </Section>
      </div>
    </>
  );
}
