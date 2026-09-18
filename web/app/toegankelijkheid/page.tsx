import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { ContentList, ContentSection } from "@/components/content/content-section";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Toegankelijkheid",
  description:
    "Toegankelijkheidsverklaring van Staatsgraaf: het nagestreefde niveau, wat al werkt, de bekende beperkingen en hoe je een probleem meldt.",
  alternates: canonical("/toegankelijkheid/"),
};

export default function AccessibilityPage() {
  return (
    <>
      <Breadcrumb
        items={[{ label: "Staatsgraaf", href: "/" }, { label: "Toegankelijkheid" }]}
      />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Toegankelijkheid</h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
        Staatsgraaf wil voor iedereen leesbaar en bedienbaar zijn. Deze verklaring beschrijft het
        nagestreefde niveau, wat al werkt, waar de site nog tekortschiet, en hoe je een probleem
        meldt.
      </p>

      <div className="mt-4">
        <ContentSection id="doel" title="Doel">
          <p>
            De site streeft naar WCAG 2.2 niveau AA. Dat geldt voor de leesbare pagina's en voor de
            interactieve onderdelen zoals de grafiek en het zoeken. De latere iOS- en iPadOS-app
            volgt de toegankelijkheidsfuncties van het platform.
          </p>
        </ContentSection>

        <ContentSection id="werkt" title="Wat werkt">
          <ContentList>
            <li>
              Toetsenbord. Alle bediening is met het toetsenbord bereikbaar: eerst de bovenbalk, dan
              de leeskolom en daarna de grafiek. De grafiek heeft eigen toetsenbordbediening.
              Pijltjestoetsen verplaatsen de selectie, Enter opent de organisatie, Escape wist de
              selectie, plus en min zoomen, en nul herstelt het beeld.
            </li>
            <li>
              Zichtbare focus. Elk bedienbaar element heeft een zichtbare focusring. De ring
              gebruikt de focuskleur uit de tokens en is in beide thema's zichtbaar.
            </li>
            <li>
              Structuur. Elke pagina heeft één h1, oplopende koppen zonder overgeslagen niveaus, en
              de landmarks header, nav, main, aside en footer.
            </li>
            <li>
              Overslaan. Een skip-link met de tekst Naar de inhoud springt direct naar de
              hoofdinhoud.
            </li>
            <li>
              Contrast. De kleurparen die het controlescript in de repository toetst, halen in zowel
              het lichte als het donkere thema de WCAG AA-minima. Het donkere thema is de standaard.
            </li>
            <li>
              Beweging. De site respecteert de systeeminstelling voor minder beweging en schakelt
              decoratieve overgangen uit.
            </li>
            <li>
              De grafiek heeft een lijstalternatief. Naast de visuele grafiek staat een lijst van
              organisaties per bestuurslaag. Bij een gekozen organisatie noemt de lijst ook de
              verbindingen, met de richting en het soort relatie. Een schermlezer hoort de selectie
              via een live melding.
            </li>
            <li>
              Zoeken is een combobox. Het zoekveld heeft een label, een uitgeklapte status, een
              resultatenlijst met opties en een live melding van het aantal resultaten.
            </li>
          </ContentList>
        </ContentSection>

        <ContentSection id="beperkingen" title="Bekende beperkingen">
          <ContentList>
            <li>
              De grafiek is in de kern visueel. De positie van knooppunten en de vorm van het
              netwerk worden niet aan een schermlezer beschreven. Dezelfde relaties staan in het
              lijstalternatief en op de organisatiepagina's.
            </li>
            <li>
              De labels in de grafiek gebruiken vaste pixelgroottes. Daardoor schalen ze niet mee
              met tekstzoom in de browser. Bij een hoge tekstschaal kunnen de labels klein blijven.
            </li>
            <li>
              De vaste tweekolomsindeling kan bij 200 procent tekstzoom krap worden. Dat is nog niet
              in een echte browser getest.
            </li>
            <li>
              Er is nog geen volledige handmatige controle met een schermlezer en een echte browser
              afgerond. Een structurele scan en de contrastcontrole zijn wel uitgevoerd.
            </li>
          </ContentList>
          <p>Deze punten worden bijgehouden en in latere rondes opgelost.</p>
        </ContentSection>

        <ContentSection id="melden" title="Een probleem melden">
          <p>
            Loop je tegen een toegankelijkheidsprobleem aan, dan kun je dat melden. Er is nog geen
            openbaar contactadres en nog geen publieke repository-URL vastgelegd, dus er is nog geen
            concrete plek voor een melding. Dat is een benoemde leemte. Zodra die gegevens er zijn,
            staat hier hoe je meldt en binnen welke termijn je een reactie kunt verwachten.
          </p>
        </ContentSection>

        <ContentSection id="herziening" title="Herziening">
          <p>
            Deze verklaring is opgesteld op 18 september 2026. De verklaring wordt herzien wanneer de
            interface verandert of wanneer een nieuw onderzoek daartoe aanleiding geeft.
          </p>
        </ContentSection>
      </div>

      <p className="py-6 text-xs text-ink-faint">
        Zie ook{" "}
        <Link href="/methodiek/" className="text-accent-text underline-offset-2 hover:underline">
          Methodiek
        </Link>{" "}
        en{" "}
        <Link href="/privacy/" className="text-accent-text underline-offset-2 hover:underline">
          Privacy
        </Link>
        .
      </p>
    </>
  );
}
