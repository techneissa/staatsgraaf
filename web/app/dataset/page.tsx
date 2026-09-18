import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { ContentList, ContentSection } from "@/components/content/content-section";
import { getDataset } from "@/lib/data";
import { formatCount, formatDate } from "@/lib/format";
import { SITE_NAME, SITE_URL, canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Dataset",
  description:
    "De volledige, bronvaste dataset van Staatsgraaf als statische JSON-bestanden: wat erin zit, onder welke licentie, hoe je hem noemt en waar je hem downloadt.",
  alternates: canonical("/dataset/"),
};

type DatasetMeta = {
  datasetVersion: string | null;
  snapshotId: string | null;
};

function readMeta(): DatasetMeta {
  const raw = readFileSync(join(process.cwd(), "..", "data", "meta.json"), "utf8");
  const meta = JSON.parse(raw) as Record<string, unknown>;
  return {
    datasetVersion: typeof meta.datasetVersion === "string" ? meta.datasetVersion : null,
    snapshotId: typeof meta.snapshotId === "string" ? meta.snapshotId : null,
  };
}

export default function DatasetPage() {
  const dataset = getDataset();
  const meta = readMeta();

  const files: { name: string; label: string; count: number | null }[] = [
    { name: "organizations.json", label: "Organisaties", count: dataset.organizations.length },
    { name: "positions.json", label: "Posities", count: dataset.positions.length },
    { name: "people.json", label: "Personen", count: dataset.people.length },
    { name: "tenures.json", label: "Dienstverbanden", count: dataset.tenures.length },
    { name: "memberships.json", label: "Lidmaatschappen", count: dataset.memberships.length },
    { name: "relations.json", label: "Relaties", count: dataset.relations.length },
    { name: "sources.json", label: "Bronnen", count: dataset.sources.length },
    { name: "topics.json", label: "Onderwerpen", count: dataset.topics.length },
    { name: "budgets.json", label: "Begrotingen", count: dataset.budgets.length },
    { name: "changes.json", label: "Wijzigingen", count: dataset.changes.length },
    { name: "news.json", label: "Nieuwsberichten", count: dataset.news.length },
    { name: "governments.json", label: "Regeringen", count: dataset.governments.length },
    { name: "media.json", label: "Media", count: dataset.media.length },
    { name: "meta.json", label: "Metadata", count: null },
  ];

  const version = meta.datasetVersion ?? "v1";
  const snapshot = meta.snapshotId !== null ? formatDate(meta.snapshotId) : null;
  const year = meta.snapshotId !== null ? meta.snapshotId.slice(0, 4) : null;
  const datasetUrl = SITE_URL ? `${SITE_URL}/dataset/` : "[url]";
  const citation =
    `${SITE_NAME}${year !== null ? ` (${year})` : ""}. ` +
    `Dataset Nederlandse rijksoverheid, versie ${version}, ` +
    `momentopname ${snapshot ?? "onbekende datum"}. ` +
    `Geraadpleegd op [datum], van ${datasetUrl}.`;

  return (
    <>
      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: "Dataset" }]} />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Dataset</h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
        De hele dataset staat als losse JSON-bestanden op deze site. Elk feit heeft een bron met een
        URL en een ophaaldatum. De bestanden zijn bedoeld voor hergebruik, onderzoek en de iOS-app
        die op dezelfde gegevens werkt.
      </p>

      <div className="mt-4">
        <ContentSection id="inhoud" title="Wat de dataset bevat">
          <p>
            De momentopname van {snapshot ?? "deze versie"} bevat{" "}
            {formatCount(dataset.organizations.length)} organisaties,{" "}
            {formatCount(dataset.positions.length)} posities, {formatCount(dataset.people.length)}{" "}
            personen, {formatCount(dataset.tenures.length)} dienstverbanden,{" "}
            {formatCount(dataset.memberships.length)} lidmaatschappen en{" "}
            {formatCount(dataset.relations.length)} relaties tussen organisaties. Daarnaast zijn er{" "}
            {formatCount(dataset.sources.length)} bronnen, {formatCount(dataset.topics.length)}{" "}
            onderwerpen, {formatCount(dataset.budgets.length)} begrotingen,{" "}
            {formatCount(dataset.changes.length)} wijzigingen en {formatCount(dataset.news.length)}{" "}
            nieuwsberichten.
          </p>
          <p>
            Elk bestand heeft een vaste naam en een vaste vorm. Verwijzingen tussen records lopen via
            een id, nooit via een naam. De dataset is een momentopname en geen live feed: nieuwe
            feiten komen pas in een volgende versie.
          </p>
        </ContentSection>

        <ContentSection id="momentopname" title="Versie en momentopname">
          <p>
            De huidige versie is <code>{version}</code> met momentopname{" "}
            <time dateTime={meta.snapshotId ?? undefined}>{snapshot ?? "onbekende datum"}</time>. De
            versie en de datum staan ook in het manifest, samen met de bestandsgroottes en een
            sha256-controlesom per bestand. Zo kun je controleren of een download compleet en
            ongewijzigd is.
          </p>
        </ContentSection>

        <ContentSection id="licentie" title="Licentie">
          <p>
            De dataset, de beschrijvingen en de samenvattingen vallen onder CC BY 4.0. Dat betekent
            dat hergebruik mag, ook commercieel, zolang je de bron noemt en de licentie vermeldt. De
            code van deze site valt onder de MIT-licentie. De volledige licentieteksten staan bij de
            downloads.
          </p>
          <ContentList>
            <li>
              Dataset:{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                rel="noopener noreferrer"
                className="text-accent-text underline-offset-2 hover:underline"
              >
                CC BY 4.0
              </a>
              , zie ook{" "}
              <a
                href="/data/v1/LICENSE-DATA.txt"
                className="text-accent-text underline-offset-2 hover:underline"
              >
                LICENSE-DATA.txt
              </a>
              .
            </li>
            <li>
              Code: MIT, zie{" "}
              <a
                href="/data/v1/LICENSE.txt"
                className="text-accent-text underline-offset-2 hover:underline"
              >
                LICENSE.txt
              </a>
              .
            </li>
          </ContentList>
          <p>
            Feiten zelf zijn niet auteursrechtelijk beschermd. De licentie geldt voor onze eigen
            bijdrage: de selectie, de structuur, de samenstelling, de beschrijvingen en de
            samenvattingen.
          </p>
        </ContentSection>

        <ContentSection id="naamsvermelding" title="Hoe je de dataset noemt">
          <p>
            Noem bij hergebruik {SITE_NAME} en de onderliggende bron. Houd bij elk feit de bron-URL en
            de ophaaldatum die in de gegevens staan. Vermeld de licentie en link naar de
            licentietekst.
          </p>
          <p>
            De volledige creditregels per bron staan in <code>ATTRIBUTION.md</code>. Dat bestand staat
            in de repository, die nog niet openbaar is. Deze verwijzing is daarom voorlopig een
            bestandsnaam zonder host en nog niet aanklikbaar in de browser. Dat is een benoemde
            leemte. Dezelfde licentie- en broninformatie staat in <code>data/meta.json</code> en{" "}
            <code>data/sources.json</code>.
          </p>
        </ContentSection>

        <ContentSection id="citeren" title="Citeer de dataset">
          <p>Gebruik bijvoorbeeld deze verwijzing:</p>
          <p className="rounded-md border border-line bg-surface-raised px-3 py-2 font-mono text-xs leading-relaxed text-ink">
            {citation}
          </p>
          <p>
            Vul de raadpleegdatum in en, als je een vast adres gebruikt, de versie en de
            momentopname. Het manifest noemt dezelfde versie en datum, zodat een lezer de juiste
            momentopname kan terugvinden.
          </p>
        </ContentSection>

        <ContentSection id="downloaden" title="Downloaden">
          <p>
            Het manifest beschrijft alle bestanden:{" "}
            <a
              href="/data/v1/manifest.json"
              className="text-accent-text underline-offset-2 hover:underline"
            >
              /data/v1/manifest.json
            </a>
            . Daaronder staat elk bestand apart.
          </p>
          <ContentList>
            {files.map((file) => (
              <li key={file.name}>
                <a
                  href={`/data/v1/${file.name}`}
                  className="text-accent-text underline-offset-2 hover:underline"
                >
                  {file.label}
                </a>{" "}
                <span className="text-ink-faint">
                  {file.name}
                  {file.count !== null ? `, ${formatCount(file.count)} records` : ""}
                </span>
              </li>
            ))}
            <li>
              <a
                href="/data/v1/LICENSE-DATA.txt"
                className="text-accent-text underline-offset-2 hover:underline"
              >
                Datumlicentie
              </a>{" "}
              <span className="text-ink-faint">LICENSE-DATA.txt</span>
            </li>
            <li>
              <a
                href="/data/v1/LICENSE.txt"
                className="text-accent-text underline-offset-2 hover:underline"
              >
                Codelicentie
              </a>{" "}
              <span className="text-ink-faint">LICENSE.txt</span>
            </li>
          </ContentList>
        </ContentSection>

        <ContentSection id="onafhankelijk" title="Onafhankelijkheid">
          <p>
            {SITE_NAME} is een onafhankelijke publicatie en is niet verbonden aan de Nederlandse
            overheid of aan enige overheidsinstantie. De gegevens komen uit openbare bronnen die per
            feit worden vermeld. Aan de weergave kunnen geen rechten worden ontleend. Bij twijfel
            raadpleeg je altijd de officiële bron.
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
