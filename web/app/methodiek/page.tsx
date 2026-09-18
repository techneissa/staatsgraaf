import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { ContentList, ContentSection } from "@/components/content/content-section";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Methodiek",
  description:
    "Hoe Staatsgraaf de dataset opbouwt: bronnen, onderzoekswerkstromen, controles, de wijzigingenfeed, het gebruik van taalmodellen en de licentie.",
  alternates: canonical("/methodiek/"),
};

export default function MethodPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Staatsgraaf", href: "/" }, { label: "Methodiek" }]} />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Methodiek</h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
        Staatsgraaf is een open, bronvaste kaart van de Nederlandse overheid. Deze pagina beschrijft
        hoe de dataset tot stand komt, welke regels voor elke bewering gelden, hoe de
        wijzigingenfeed werkt, waar taalmodellen wel en niet worden gebruikt, en welke grenzen de
        data nu hebben.
      </p>

      <div className="mt-4">
        <ContentSection id="opbouw" title="Hoe de dataset tot stand komt">
          <p>
            De opbouw verloopt in fasen. Eerst legt een nulmeting de telbare uitgangspunten vast: de
            samenstelling van het kabinet, de ministeries, de zetels in de Eerste en Tweede Kamer,
            en de aantallen provincies, gemeenten en waterschappen. Elk gegeven krijgt een bron en
            een datum.
          </p>
          <p>
            Daarna werken vijftien onderzoekswerkstromen parallel aan deelgebieden: de regering en
            de ministeries, rijksdiensten, zelfstandige bestuursorganen en rechtspersonen met een
            wettelijke taak, het parlement, de rechterlijke macht, hoge colleges en adviescolleges,
            de decentrale overheid, de wettelijke grondslagen, personen en benoemingen, nieuws en
            koppeling, onderwerpen, begroting, en de studies naar ontwerp, referentiemodel en
            licentie.
          </p>
          <p>
            Elke werkstroom levert dezelfde vorm van uitvoer: een JSON-bestand en een
            markdown-rapport. Bij elk feit staat een bron, een ophaaldatum en een
            betrouwbaarheidsniveau (hoog, midden of laag).
          </p>
          <p>
            De merge-stap voegt de bestanden samen tot de dataset in de map <code>data/</code>.
            Conflicten worden niet stil opgelost, maar vastgelegd in <code>research/merge-log.md</code>.
            Daarna controleren validators de dataset tegen het schema en op verwijzingen tussen
            records. De web-app leest de samengevoegde dataset op buildtijd en doet geen
            runtime-verzoeken aan bronnen.
          </p>
        </ContentSection>

        <ContentSection id="bronnen" title="Elke bewering heeft een bron">
          <p>
            Elk niet-triviaal feit verwijst naar een bron met een URL, een ophaaldatum en een
            betrouwbaarheidsniveau. De regel is: ophalen, nooit uit het geheugen. Een naam, datum of
            aantal wordt niet opgeschreven zonder dat de bron is opgehaald.
          </p>
          <p>
            Als een bron niet bereikbaar is, wordt er geen waarde ingevuld. In plaats daarvan staat
            er een benoemde leemte met de reden en het adres waar het ontbrekende gegeven te vinden
            is. Zo blijft zichtbaar wat wel en niet is onderzocht, ook wanneer een werkstroom niet
            volledig is afgerond.
          </p>
        </ContentSection>

        <ContentSection id="wijzigingen" title="De wijzigingenfeed">
          <p>
            De wijzigingenfeed vergelijkt de nieuwste dataset met de vorige. Records worden op id
            gekoppeld, nooit op naam. Daardoor wordt een naamswijziging niet gelezen als een vertrek
            plus een aanstelling.
          </p>
          <p>
            De vergelijking herkent zes soorten wijziging: een nieuw dienstverband (aanstelling), een
            beëindigd dienstverband (vertrek), een vacature wanneer het aantal bezette zetels daalt,
            een nieuwe organisatie, een naamswijziging en een verplaatsing.
          </p>
          <p>
            Elke wijziging draagt de datum van het onderliggende feit en de bron van het record dat
            de wijziging veroorzaakt. Zonder bron wordt de wijziging niet gepubliceerd.
          </p>
          <p>
            Zolang er geen eerdere versie is, schrijft de vergelijking geen geschiedenis. De eerste
            vulling komt uit een aparte, deterministische stap die alleen feiten met een datum of
            een zetelaantal overneemt. Een leemte in de vorige versie blijft een leemte. De volledige
            regels staan in <code>pipelines/diff-spec.md</code>.
          </p>
        </ContentSection>

        <ContentSection id="ai" title="Taalmodellen en menselijke controle">
          <p>
            Voor het beschrijven en samenvatten staat het beleid het gebruik van taalmodellen toe.
            De hoofdregel is strikt: een model mag feiten die een bron noemt samenvatten,
            herschrijven en van verwijzingen voorzien, maar mag nooit een feit toevoegen dat de bron
            niet noemt. Twijfelt het model, dan wordt de uitvoer geschrapt of gemarkeerd, nooit
            geraden.
          </p>
          <p>
            De toegestane toepassingen zijn het opstellen van beschrijvingen bij organisaties en
            posities, het samenvatten van nieuwsberichten, het koppelen van entiteiten in die
            samenvattingen, het schrijven van een regel bij een wijziging, en het opstellen van een
            onderwerpstekst. Elke toepassing heeft een vaste controle: beschrijvingen worden tegen
            de aangehaalde bron gecontroleerd, nieuws mag alleen bevatten wat het artikel zelf zegt,
            en koppelingen gaan via de aliassenlijst met een drempel en een handmatige
            controlelijst.
          </p>
          <p>
            Alles wat op de homepage verschijnt, krijgt voor publicatie een controle door een mens
            of een gecontroleerde agent. Beschrijvingen worden bij de merge eenmalig tegen hun bron
            bevestigd en daarna alleen herzien als de bron verandert. Modeluitvoer wordt nooit als
            eigen verslaggeving gepresenteerd, en elke AI-ondersteunde tekst verwijst naar de
            onderliggende bron.
          </p>
          <p>
            In de huidige dataset komen nieuwssamenvattingen niet van een taalmodel. Ze worden met
            een vaste tekst opgebouwd uit de titel en de inleiding van het artikel zelf. Welk model
            in de toekomst wordt gebruikt voor de toegestane toepassingen, staat nog niet vast in de
            repository. Dat is een open punt.
          </p>
        </ContentSection>

        <ContentSection id="correcties" title="Correcties en het correctielogboek">
          <p>
            Een gepubliceerd feit wordt niet stil aangepast. Elke correctie wordt vastgelegd met de
            oude waarde, de nieuwe waarde, de datum en de reden, in een openbaar logboek. Iemand die
            de oude waarde heeft gezien, kan terugvinden wat er is veranderd en waarom.
          </p>
          <p>Een ernstige fout krijgt tijdelijk een korte melding op de betrokken pagina.</p>
          <p>
            De correctieprocedure staat beschreven, maar er is nog geen openbaar contactadres en nog
            geen publieke repository-URL vastgelegd. Daardoor is er nog geen concrete plek waar je
            een correctie kunt melden. Dat is een benoemde leemte. Zodra het adres en de repository
            bekend zijn, staat hier hoe je een correctie meldt.
          </p>
        </ContentSection>

        <ContentSection id="licenties" title="Licenties en hergebruik">
          <p>
            De code van Staatsgraaf valt onder de MIT-licentie. De dataset, de beschrijvingen en de
            samenvattingen vallen onder CC BY 4.0. Hergebruik mag, ook commercieel, zolang de bron
            wordt genoemd.
          </p>
          <p>
            Naamsvermelding verwijst naar Staatsgraaf en naar de onderliggende bron, met de
            bron-URL en de ophaaldatum. De volledige lijst per bron met licenties en creditregels
            staat in <code>ATTRIBUTION.md</code>. De repository-URL is nog niet vastgelegd, dus deze
            verwijzing is voorlopig een bestandsnaam zonder host en nog niet aanklikbaar in de
            browser. Dat is een benoemde leemte. De licentiegegevens staan ook in <code>data/meta.json</code>.
          </p>
        </ContentSection>

        <ContentSection id="grenzen" title="Grenzen van de data">
          <p>De dataset is nog niet compleet. De volgende grenzen zijn bekend en benoemd.</p>
          <ContentList>
            <li>
              844 posities hebben nog geen dienstverband met een bron. Het gaat vooral om
              zetelgebonden functies zoals raadslid, statenlid, wethouder en gedeputeerde, en om een
              aantal griffiers, secretarissen-generaal en diensthoofden.
            </li>
            <li>
              Koepelorganisaties zoals de VNG, het IPO, de Unie van Waterschappen, de GGD'en en de
              omgevingsdiensten zijn nog niet gemodelleerd.
            </li>
            <li>
              De drie landen van het Koninkrijk (Aruba, Curaçao en Sint Maarten) met hun gouverneurs
              en Gevolmachtigde Ministers zijn nog niet gemodelleerd.
            </li>
            <li>
              <code>media.json</code> is leeg. Er zijn dus nog geen portretten met een vastgelegde
              licentie en credit.
            </li>
            <li>
              Twee nieuwsbronnen weigeren verzoeken met een 403-status. Van die artikelen ontbreekt
              een deel.
            </li>
            <li>
              De wijzigingenfeed classificeert nog geen lidmaatschappen van grote colleges.
            </li>
          </ContentList>
          <p>
            Deze punten staan gepland voor een latere uitbreiding. Ze worden niet opgevuld met een
            aanname.
          </p>
        </ContentSection>
      </div>

      <p className="py-6 text-xs text-ink-faint">
        Deze pagina is opgesteld op 18 september 2026. Zie ook{" "}
        <Link href="/privacy/" className="text-accent-text underline-offset-2 hover:underline">
          Privacy
        </Link>{" "}
        en{" "}
        <Link
          href="/toegankelijkheid/"
          className="text-accent-text underline-offset-2 hover:underline"
        >
          Toegankelijkheid
        </Link>
        .
      </p>
    </>
  );
}
