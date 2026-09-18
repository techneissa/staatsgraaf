import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { ContentList, ContentSection } from "@/components/content/content-section";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Privacyverklaring van Staatsgraaf: welke gegevens de site wel en niet verwerkt, op welke grondslag dat gebeurt, en hoe correctie of verwijdering werkt.",
  alternates: canonical("/privacy/"),
};

export default function PrivacyPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Staatsgraaf", href: "/" }, { label: "Privacy" }]} />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Privacy</h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
        Staatsgraaf is een onafhankelijke publicatie over de Nederlandse overheid. De site is niet
        verbonden aan de Nederlandse overheid of aan enige overheidsinstantie. Deze verklaring zegt
        wat de site doet en wat de site niet doet.
      </p>

      <div className="mt-4">
        <ContentSection id="niet" title="Wat de site niet doet">
          <ContentList>
            <li>De site plaatst geen cookies en gebruikt geen vergelijkbare volgtechniek.</li>
            <li>
              De site heeft geen bezoekersstatistiek en geen advertentie- of analysedienst. De code
              bevat geen analytics.
            </li>
            <li>
              De site laadt geen externe scripts, widgets of lettertypen van derden. Alles komt van
              de site zelf. Het zoekveld haalt alleen een indexbestand van de site zelf op.
            </li>
            <li>De site heeft geen accounts en geen formulieren die persoonsgegevens opslaan.</li>
          </ContentList>
          <p>
            De enige voorkeur die lokaal wordt bewaard, is het gekozen thema (licht of donker). Die
            voorkeur staat in de opslag van je eigen browser, wordt niet naar een server verstuurd,
            en verdwijnt wanneer je de opslag van de site wist.
          </p>
        </ContentSection>

        <ContentSection id="dataset" title="Welke gegevens de dataset bevat">
          <p>
            De dataset gaat over personen met een publieke functie. De gegevens komen uit bronnen
            die de overheid zelf openbaar maakt, zoals wetten, benoemingsbesluiten, registers en de
            websites van de organen.
          </p>
          <p>
            De grondslag is het algemeen belang bij een publiek overzicht van de overheid, in
            combinatie met het feit dat de gegevens al openbaar zijn. De dataset bevat naam, functie,
            organisatie en datums van aanstelling en vertrek, met per feit een bron.
          </p>
          <p>
            Er zijn geen contactgegevens, geen privéadressen, geen gezinsgegevens en geen
            geboortedatums, tenzij de overheid die zelf openbaar heeft gemaakt en ze nodig zijn om de
            structuur te begrijpen. Wat niet nodig is voor dat overzicht, wordt niet verzameld.
          </p>
        </ContentSection>

        <ContentSection id="logs" title="Serverlogbestanden">
          <p>
            De site wordt als statische bestanden gehost. De hostingpartij kan technische
            logbestanden bijhouden, zoals IP-adressen en opgevraagde bestanden. Welke partij dat is
            en hoe lang die logbestanden worden bewaard, staat nog niet vast. Dat is een benoemde
            leemte. Zodra de host bekend is, worden de termijn en de verwerking hier vermeld.
          </p>
        </ContentSection>

        <ContentSection id="bewaren" title="Bewaartermijn">
          <p>
            De datasetgeschiedenis en de gedateerde ruwe momentopnames worden bewaard om eerdere
            gepubliceerde versies te kunnen herleiden en om correcties te kunnen controleren. Er is
            nog geen vaste bewaartermijn vastgelegd. Dat is een open punt.
          </p>
        </ContentSection>

        <ContentSection id="correctie" title="Correctie of verwijdering">
          <p>
            Een persoon kan een feitelijke fout laten corrigeren. De fout wordt hersteld en de
            wijziging komt met datum en reden in het correctielogboek. Een verzoek om een gegeven
            over een publieke functie te verwijderen, wordt beoordeeld tegen de grondslag van het
            algemeen belang en het recht van bezwaar.
          </p>
          <p>
            Er is nog geen openbaar contactadres en nog geen publieke repository-URL vastgelegd.
            Daardoor is er nog geen concrete plek waar een verzoek kan worden ingediend. Dat is een
            benoemde leemte. Zodra die gegevens er zijn, staat hier hoe je een correctie of
            verwijdering aanvraagt.
          </p>
        </ContentSection>

        <ContentSection id="verantwoordelijke" title="Verwerkingsverantwoordelijke">
          <p>
            De verwerkingsverantwoordelijke is het onafhankelijke project Staatsgraaf. Er is geen
            overheidsinstantie bij de verwerking betrokken en er is geen Functionaris
            Gegevensbescherming aangesteld.
          </p>
        </ContentSection>
      </div>

      <p className="py-6 text-xs text-ink-faint">
        Deze verklaring is opgesteld op 18 september 2026. Zie ook{" "}
        <Link href="/methodiek/" className="text-accent-text underline-offset-2 hover:underline">
          Methodiek
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
