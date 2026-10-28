import type { Metadata } from "next";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Building,
  CalendarRange,
  Coins,
  Database,
  Download,
  FileDiff,
  Files,
  Flag,
  Gavel,
  Handshake,
  IdCard,
  FileJson,
  FileText,
  Image,
  Landmark,
  Languages,
  Link as LinkGlyph,
  Network,
  Newspaper,
  Quote,
  Route,
  Rows3,
  Scale,
  ShieldCheck,
  Tags,
  Users,
  Vote,
  type IconNode,
} from "lucide";
import { Breadcrumb } from "@/components/breadcrumb";
import { T } from "@/components/i18n/t";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { SectionHeading } from "@/components/icons/section-heading";
import { DownloadButton } from "./download-button";
import { CountBadge } from "./count-badge";
import { CountUp, FileSize, Rise } from "./motion";
import { manifestFileCount, recordCount } from "@/lib/dataset-counts";
import { getS } from "@/lib/i18n/server-strings";
import { SITE_NAME, SITE_URL, canonical } from "@/lib/site";

/**
 * Build-time SEO stays Dutch by design: pageMetadata copy is build-time only.
 */
export const metadata: Metadata = {
  title: getS("pages", "datasetTitle"),
  description:
    "De volledige, bronvaste dataset van Staatsgraaf als statische JSON-bestanden: wat erin zit, onder welke licentie, hoe je hem noemt en waar je hem downloadt.",
  alternates: canonical("/dataset/"),
};

const DATA_DIR = join(process.cwd(), "..", "data");

type DatasetMeta = {
  datasetVersion: string | null;
  snapshotId: string | null;
};

function readMeta(): DatasetMeta {
  const meta = JSON.parse(readFileSync(join(DATA_DIR, "meta.json"), "utf8")) as Record<string, unknown>;
  return {
    datasetVersion: typeof meta.datasetVersion === "string" ? meta.datasetVersion : null,
    snapshotId: typeof meta.snapshotId === "string" ? meta.snapshotId : null,
  };
}

/** Size in bytes of a file, or null when it is not there. */
function fileBytes(path: string): number | null {
  try {
    return statSync(path).size;
  } catch {
    return null;
  }
}

/** Number of records in a data file, read at build time; null when the file is not a list. */
function countRecords(name: string): number | null {
  try {
    return recordCount(JSON.parse(readFileSync(join(DATA_DIR, name), "utf8")));
  } catch {
    return null;
  }
}

/**
 * One card per record type. A restrained tint per family: the tint only
 * colours the icon and its chip, the count and label stay in ink.
 */
type Tint = "regering" | "kamer" | "raad" | "zelfstandig" | "nieuws" | "water";

const TINT: Record<Tint, string> = {
  regering: "bg-sector-regering/12 text-sector-regering",
  kamer: "bg-sector-staten-generaal/12 text-sector-staten-generaal",
  raad: "bg-sector-hoge-colleges/12 text-sector-hoge-colleges",
  zelfstandig: "bg-sector-zelfstandig/12 text-sector-zelfstandig",
  nieuws: "bg-sector-koninkrijk/12 text-sector-koninkrijk",
  water: "bg-sector-waterschap/12 text-sector-waterschap",
};

type RecordType = {
  file: string;
  labelKey: string;
  icon: IconNode;
  tint: Tint;
  /** The site section for this type; without one the card links to its download. */
  href?: string;
};

const RECORD_TYPES: RecordType[] = [
  { file: "organizations.json", labelKey: "fileOrganizations", icon: Building, tint: "regering", href: "/organisaties/" },
  { file: "people.json", labelKey: "filePeople", icon: Users, tint: "kamer", href: "/personen/" },
  { file: "positions.json", labelKey: "filePositions", icon: BriefcaseBusiness, tint: "regering", href: "/posities/" },
  { file: "tenures.json", labelKey: "fileTenures", icon: CalendarRange, tint: "zelfstandig" },
  { file: "memberships.json", labelKey: "fileMemberships", icon: IdCard, tint: "kamer", href: "/partijen/" },
  { file: "careers.json", labelKey: "fileCareers", icon: Route, tint: "zelfstandig" },
  { file: "activities.json", labelKey: "fileActivities", icon: Gavel, tint: "kamer" },
  { file: "relations.json", labelKey: "fileRelations", icon: Network, tint: "raad" },
  { file: "governments.json", labelKey: "fileGovernments", icon: Landmark, tint: "regering" },
  { file: "coalitions.json", labelKey: "fileCoalitions", icon: Handshake, tint: "regering" },
  { file: "elections.json", labelKey: "fileElections", icon: Vote, tint: "kamer" },
  { file: "budgets.json", labelKey: "fileBudgets", icon: Coins, tint: "water", href: "/begroting/" },
  { file: "changes.json", labelKey: "fileChanges", icon: FileDiff, tint: "raad", href: "/wijzigingen/" },
  { file: "news.json", labelKey: "fileNews", icon: Newspaper, tint: "nieuws", href: "/nieuws/" },
  { file: "news-translations.json", labelKey: "fileNewsTranslations", icon: Languages, tint: "nieuws" },
  { file: "description-translations.json", labelKey: "fileDescriptionTranslations", icon: Languages, tint: "raad" },
  { file: "description-flags.json", labelKey: "fileDescriptionFlags", icon: Flag, tint: "raad" },
  { file: "topics.json", labelKey: "fileTopics", icon: Tags, tint: "water", href: "/onderwerpen/" },
  { file: "sources.json", labelKey: "fileSources", icon: LinkGlyph, tint: "zelfstandig" },
  { file: "media.json", labelKey: "fileMedia", icon: Image, tint: "nieuws" },
];

function fileAnchor(file: string): string {
  return `bestand-${file.replace(/\.json$/, "")}`;
}

const CARD =
  "rounded-md border border-line bg-surface-raised transition-[border-color,background-color,scale] duration-150 hover:border-line-strong hover:bg-surface motion-safe:active:scale-[0.985]";

function RecordCard({ type, count }: { type: RecordType; count: number }) {
  const href = type.href ?? `#${fileAnchor(type.file)}`;
  const body = (
    <>
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${TINT[type.tint]}`}>
        <LucideIcon icon={type.icon} size={16} strokeWidth={1.9} />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold tabular-nums leading-tight text-ink">
          <CountUp value={count} />
        </span>
        <span className="block text-xs leading-snug text-ink-muted">
          <T area="pages" k={type.labelKey} />
        </span>
      </span>
    </>
  );
  const className = `flex h-full min-h-14 items-center gap-3 px-3 py-2.5 ${CARD}`;
  return type.href !== undefined ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <a href={href} className={className}>
      {body}
    </a>
  );
}

type DownloadFile = {
  name: string;
  labelKey: string;
  icon: IconNode;
  tint: Tint;
  count: number | null;
  countKey: "recordsWord" | "filesListedWord";
  countIcon: IconNode;
  bytes: number | null;
};

/** Width of one monospace character, with a little margin, in em. */
const MONO_EM = 0.62;

/**
 * The file name runs the full width of the card on one line, never wrapped or
 * cut. It is 12 px, and shrinks only as far as the longest names need to fit.
 * The card is a size container, so 100cqw is the width inside its padding.
 */
function nameFontSize(name: string): string {
  return `min(12px, calc(100cqw / ${(name.length * MONO_EM).toFixed(2)}))`;
}

/**
 * A card has the icon and the 44 px download button on top, the file name on
 * its own full-width line, then the label on the left with the record count and
 * the size stacked under the button on the right. The count shows an icon, not
 * the word "records"; the word stays for screen readers and the tooltip.
 */
function DownloadCard({ file }: { file: DownloadFile }) {
  const href = `/data/v1/${file.name}`;
  const right = "col-start-2 justify-self-end whitespace-nowrap text-xs leading-snug text-ink-faint";
  return (
    <div
      id={fileAnchor(file.name)}
      className={`@container grid h-full scroll-mt-4 grid-cols-[minmax(0,1fr)_auto] content-start gap-x-1.5 p-2 ${CARD}`}
    >
      <span className={`col-start-1 row-start-1 flex size-11 shrink-0 items-center justify-center rounded-md ${TINT[file.tint]}`}>
        <LucideIcon icon={file.icon} size={20} strokeWidth={1.9} />
      </span>
      <div className="col-start-2 row-start-1 justify-self-end">
        <DownloadButton file={file.name} href={href} />
      </div>
      <p
        title={file.name}
        style={{ fontSize: nameFontSize(file.name) }}
        className="col-span-2 row-start-2 mt-1.5 whitespace-nowrap font-mono leading-snug text-ink"
      >
        {file.name}
      </p>
      <p className="col-start-1 row-span-2 row-start-3 min-w-0 text-xs leading-snug text-ink-muted [overflow-wrap:anywhere]">
        <T area="pages" k={file.labelKey} />
      </p>
      {file.count !== null ? (
        <p className={`row-start-3 ${right}`}>
          <CountBadge value={file.count} icon={file.countIcon} wordKey={file.countKey} />
        </p>
      ) : null}
      {file.bytes !== null ? (
        <p className={`row-start-4 tabular-nums ${right}`}>
          <FileSize bytes={file.bytes} />
        </p>
      ) : null}
    </div>
  );
}

function Section({
  id,
  titleKey,
  icon,
  children,
}: {
  id: string;
  titleKey: string;
  icon: IconNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-titel`} className="border-b border-line py-6 last:border-b-0">
      <SectionHeading id={`${id}-titel`} icon={icon}>
        <T area="pages" k={titleKey} />
      </SectionHeading>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 ps-5 marker:text-ink-faint">{children}</ul>;
}

export default function DatasetPage() {
  const meta = readMeta();

  const records = RECORD_TYPES.flatMap((type) => {
    const count = countRecords(type.file);
    return count === null ? [] : [{ type, count }];
  });
  const manifestPath = join(process.cwd(), "public", "data", "v1", "manifest.json");
  const manifestBytes = fileBytes(manifestPath);
  let manifestFiles: number | null = null;
  try {
    manifestFiles = manifestFileCount(JSON.parse(readFileSync(manifestPath, "utf8")));
  } catch {
    manifestFiles = null;
  }
  const downloads: DownloadFile[] = [
    ...(manifestBytes !== null
      ? [
          {
            name: "manifest.json",
            labelKey: "fileManifest",
            icon: FileJson,
            tint: "raad" as const,
            count: manifestFiles,
            countKey: "filesListedWord" as const,
            countIcon: Files,
            bytes: manifestBytes,
          },
        ]
      : []),
    ...records.map(({ type, count }) => ({
      name: type.file,
      labelKey: type.labelKey,
      icon: type.icon,
      tint: type.tint,
      count,
      countKey: "recordsWord" as const,
      countIcon: Rows3,
      bytes: fileBytes(join(DATA_DIR, type.file)),
    })),
    {
      name: "meta.json",
      labelKey: "fileMeta",
      icon: FileText,
      tint: "raad",
      count: null,
      countKey: "recordsWord",
      countIcon: Rows3,
      bytes: fileBytes(join(DATA_DIR, "meta.json")),
    },
  ];

  const version = meta.datasetVersion ?? "v1";
  const year = meta.snapshotId !== null ? meta.snapshotId.slice(0, 4) : null;
  const datasetUrl = SITE_URL ? `${SITE_URL}/dataset/` : "[url]";
  const citation = `${SITE_NAME}${year !== null ? ` (${year})` : ""}. Dataset Nederlandse overheid, ${version}. ${datasetUrl}`;

  return (
    <>
      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: <T area="pages" k="datasetTitle" /> }]} />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        <T area="pages" k="datasetTitle" />
      </h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
        <T area="pages" k="datasetIntro" />
      </p>

      <div className="mt-4">
        <Section id="inhoud" titleKey="datasetContentsTitle" icon={Database}>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10.5rem),1fr))] gap-2">
            {records.map(({ type, count }) => (
              <li key={type.file}>
                <Rise>
                  <RecordCard type={type} count={count} />
                </Rise>
              </li>
            ))}
          </ul>
          <p>
            <T area="pages" k="datasetContentsP2" />
          </p>
        </Section>

        <Section id="licentie" titleKey="datasetLicenseTitle" icon={Scale}>
          <p>
            <T area="pages" k="datasetLicenseP1" />
          </p>
          <List>
            <li>
              <T area="pages" k="datasetLicenseData" />{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                rel="noopener noreferrer"
                className="text-accent-text underline-offset-2 hover:underline"
              >
                CC BY 4.0
              </a>
              , <T area="pages" k="datasetLicenseSee" />{" "}
              <a
                href="/data/v1/LICENSE-DATA.txt"
                className="text-accent-text underline-offset-2 hover:underline"
              >
                LICENSE-DATA.txt
              </a>
              .
            </li>
            <li>
              <T area="pages" k="datasetLicenseCode" />{" "}
              <a
                href="/data/v1/LICENSE.txt"
                className="text-accent-text underline-offset-2 hover:underline"
              >
                LICENSE.txt
              </a>
              .
            </li>
          </List>
          <p>
            <T area="pages" k="datasetLicenseFacts" />
          </p>
        </Section>

        <Section id="naamsvermelding" titleKey="datasetAttributionTitle" icon={Quote}>
          <p>
            <T area="pages" k="datasetAttributionP1" vars={{ site: SITE_NAME }} />
          </p>
          <p className="rounded-md border border-line bg-surface-raised px-3 py-2 font-mono text-xs leading-relaxed text-ink">
            {citation}
          </p>
          <p className="text-xs text-ink-faint">
            <T area="pages" k="datasetPhotoCredits" />{" "}
            <T area="pages" k="photoCreditsDatasetNote" />
          </p>
        </Section>

        <Section id="downloaden" titleKey="datasetDownloadTitle" icon={Download}>
          {/* Two columns once the section is 22rem wide, so a 320 px phone gets one. */}
          <div className="@container">
            <ul className="grid grid-cols-1 gap-2 @[22rem]:grid-cols-2">
              {downloads.map((file) => (
                <li key={file.name}>
                  <Rise>
                    <DownloadCard file={file} />
                  </Rise>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section id="onafhankelijk" titleKey="datasetIndependenceTitle" icon={ShieldCheck}>
          <p>
            <T area="pages" k="datasetIndependenceP1" vars={{ site: SITE_NAME }} />
          </p>
        </Section>
      </div>

    </>
  );
}
