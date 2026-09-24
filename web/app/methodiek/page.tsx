import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { L, T } from "@/components/i18n/t";
import { getDatasetDate } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { newsTranslationCoverage } from "@/lib/news-translations";
import { formatNewsDayLabel } from "@/lib/news-page";
import { getS } from "@/lib/i18n/server-strings";
import { canonical, SITE_NAME } from "@/lib/site";

/**
 * Build-time SEO stays Dutch by design: pageMetadata copy is build-time only.
 */
export const metadata: Metadata = {
  title: getS("pages", "methodTitle"),
  description:
    "Hoe Staatsgraaf de dataset opbouwt: bronnen, onderzoekswerkstromen, controles, de wijzigingenfeed, het gebruik van taalmodellen en de licentie.",
  alternates: canonical("/methodiek/"),
};

function Section({
  id,
  titleKey,
  children,
}: {
  id: string;
  titleKey: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-titel`} className="border-b border-line py-6 last:border-b-0">
      <h2 id={`${id}-titel`} className="text-lg font-semibold tracking-tight text-ink">
        <T area="pages" k={titleKey} />
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 ps-5 marker:text-ink-faint">{children}</ul>;
}

export default function MethodPage() {
  const coverage = newsTranslationCoverage();
  const datasetDate = getDatasetDate();
  return (
    <>
      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: <T area="pages" k="methodTitle" /> }]} />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        <T area="pages" k="methodTitle" />
      </h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
        <T area="pages" k="methodIntro" />
      </p>

      <div className="mt-4">
        <Section id="opbouw" titleKey="methodBuildTitle">
          <p>
            <T area="pages" k="methodBuildP1" />
          </p>
          <p>
            <T area="pages" k="methodBuildP2" />
          </p>
          <p>
            <T area="pages" k="methodBuildP3" />
          </p>
          <p>
            <T area="pages" k="methodBuildP4a" /> <code>data/</code>
            <T area="pages" k="methodBuildP4b" /> <code>research/merge-log.md</code>
            <T area="pages" k="methodBuildP4c" />
          </p>
        </Section>

        <Section id="bronnen" titleKey="methodSourcesTitle">
          <p>
            <T area="pages" k="methodSourcesP1" />
          </p>
          <p>
            <T area="pages" k="methodSourcesP2" />
          </p>
        </Section>

        <Section id="wijzigingen" titleKey="methodChangesTitle">
          <p>
            <T area="pages" k="methodChangesP1" />
          </p>
          <p>
            <T area="pages" k="methodChangesP2" />
          </p>
          <p>
            <T area="pages" k="methodChangesP3" />
          </p>
          <p>
            <T area="pages" k="methodChangesP4a" /> <code>pipelines/diff-spec.md</code>.
          </p>
        </Section>

        <Section id="onderhoud" titleKey="methodMaintTitle">
          <p>
            <T area="pages" k="methodMaintP1" />
          </p>
          <p>
            <T area="pages" k="methodMaintP2" />
          </p>
          <p>
            <T area="pages" k="methodMaintP3" />
          </p>
          <p>
            <T area="pages" k="methodMaintP4" />
          </p>
        </Section>

        <Section id="ai" titleKey="methodAiTitle">
          <p>
            <T area="pages" k="methodAiP1" />
          </p>
          <p>
            <T area="pages" k="methodAiP2" />
          </p>
          <p>
            <T area="pages" k="methodAiP3" />
          </p>
          <p>
            <L
              nl="Nieuwssamenvattingen komen niet van een taalmodel. Ze worden met een vaste tekst opgebouwd uit de titel en de inleiding van het artikel zelf. Het enige taalmodel dat nu tekst levert die je op de site leest, is de vertaling van nieuwskoppen en inleidingen hieronder."
              en="News summaries do not come from a language model. They are built with a fixed template from the title and the lead of the article itself. The only language model that now produces text you read on the site is the translation of news headlines and leads described below."
            />
          </p>
        </Section>

        <section aria-labelledby="machinevertaling-titel" id="machinevertaling" className="scroll-mt-4 border-b border-line py-6">
          <h2 id="machinevertaling-titel" className="text-lg font-semibold tracking-tight text-ink">
            <L nl="Machinevertaling van nieuws" en="Machine translation of news" />
          </h2>
          <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-muted">
            <p>
              <L
                nl="De kop en de inleiding van elk nieuwsbericht worden vertaald naar de andere taal van de site: Nederlandse berichten naar het Engels, Engelse berichten naar het Nederlands. De vertaling wordt gemaakt door een taalmodel, Claude van Anthropic. Een nieuw bericht wordt automatisch vertaald bij de volgende verversing; tot dan zie je het origineel, gemarkeerd met de taal waarin het is gepubliceerd."
                en="The headline and lead of every news item are translated into the other language of the site: Dutch items into English, English items into Dutch. The translation is made by a language model, Claude by Anthropic. A new item is translated automatically at the next refresh; until then you see the original, tagged with the language it was published in."
              />
            </p>
            <List>
              <li>
                <L
                  nl="Alleen een getrouwe vertaling. Het model vat niet samen en voegt niets toe; namen, getallen en citaten blijven exact."
                  en="A faithful translation only. The model does not summarise and adds nothing; names, numbers and quotes stay exact."
                />
              </li>
              <li>
                <L
                  nl="Namen van personen, organisaties en posities blijven Nederlands en onvertaald. De koppelingen naar hun pagina's blijven dezelfde; een vertaling waarin een koppeling verandert, wordt niet gebruikt."
                  en="Names of people, organizations and positions stay in Dutch, untranslated. The links to their pages stay the same; a translation that changes a link is not used."
                />
              </li>
              <li>
                <L
                  nl="Elke vertaalde kaart draagt het label Vertaald uit het Engels of Translated from Dutch, en een knop Toon origineel. Het origineel is dus altijd één klik weg."
                  en="Every translated card carries the label Translated from Dutch or Vertaald uit het Engels, and a Show original button. The original is always one click away."
                />
              </li>
              <li>
                <L
                  nl="De bronlink blijft ongewijzigd en gaat altijd naar het oorspronkelijke artikel bij de uitgever."
                  en="The source link is unchanged and always goes to the original article at the publisher."
                />
              </li>
              <li>
                <L
                  nl="Elke vertaling is gekoppeld aan de exacte brontekst met een controlegetal. Verandert de kop of de inleiding van een bericht, dan verdwijnt de oude vertaling tot er een nieuwe is."
                  en="Every translation is tied to the exact source text by a checksum. When the headline or lead of an item changes, the old translation is dropped until a new one exists."
                />
              </li>
            </List>
            <p className="text-xs text-ink-faint">
              <L nl="Dekking in deze versie van de dataset" en="Coverage in this version of the dataset" />
              {datasetDate !== null ? ` (${formatNewsDayLabel(datasetDate, "nl")})` : null}: {formatCount(coverage.translated)}{" "}
              <L nl="van" en="of" /> {formatCount(coverage.items)}{" "}
              <L nl="berichten hebben een geldige vertaling." en="items have a valid translation." />
            </p>
          </div>
        </section>

        <Section id="correcties" titleKey="methodCorrectionsTitle">
          <p>
            <T area="pages" k="methodCorrectionsP1" />
          </p>
          <p>
            <T area="pages" k="methodCorrectionsP2" />
          </p>
          <p>
            <T area="pages" k="methodCorrectionsP3" />
          </p>
        </Section>

        <Section id="licenties" titleKey="methodLicensesTitle">
          <p>
            <T area="pages" k="methodLicensesP1" />
          </p>
          <p>
            <T area="pages" k="methodLicensesP2a" /> <code>ATTRIBUTION.md</code>
            <T area="pages" k="methodLicensesP2b" /> <code>data/meta.json</code>.
          </p>
        </Section>

        <Section id="grenzen" titleKey="methodLimitsTitle">
          <p>
            <T area="pages" k="methodLimitsIntro" />
          </p>
          <List>
            <li>
              <T area="pages" k="methodLimits1" />
            </li>
            <li>
              <T area="pages" k="methodLimits2" />
            </li>
            <li>
              <T area="pages" k="methodLimits3" />
            </li>
            <li>
              <T area="pages" k="methodLimits4a" /> <code>data/media.json</code>
              <T area="pages" k="methodLimits4b" />
            </li>
            <li>
              <T area="pages" k="methodLimits5" />
            </li>
            <li>
              <T area="pages" k="methodLimits6" />
            </li>
            <li>
              <T area="pages" k="methodLimits7" />
            </li>
          </List>
          <p>
            <T area="pages" k="methodLimitsOutro" />
          </p>
        </Section>
      </div>

      <p className="py-6 text-xs text-ink-faint">
        <T area="pages" k="methodFooterPre" />{" "}
        <Link href="/privacy/" className="text-accent-text underline-offset-2 hover:underline">
          <T area="pages" k="linkPrivacy" />
        </Link>{" "}
        <T area="pages" k="andWord" />{" "}
        <Link
          href="/toegankelijkheid/"
          className="text-accent-text underline-offset-2 hover:underline"
        >
          <T area="pages" k="linkAccessibility" />
        </Link>
        .
      </p>
    </>
  );
}
