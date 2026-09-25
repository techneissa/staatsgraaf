import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { T } from "@/components/i18n/t";
import { getDataset } from "@/lib/data";
import { formatCount, formatDate } from "@/lib/format";
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

export default function DatasetPage() {
  const dataset = getDataset();
  const meta = readMeta();

  const files: { name: string; labelKey: string; count: number | null }[] = [
    { name: "organizations.json", labelKey: "fileOrganizations", count: dataset.organizations.length },
    { name: "positions.json", labelKey: "filePositions", count: dataset.positions.length },
    { name: "people.json", labelKey: "filePeople", count: dataset.people.length },
    { name: "tenures.json", labelKey: "fileTenures", count: dataset.tenures.length },
    { name: "memberships.json", labelKey: "fileMemberships", count: dataset.memberships.length },
    { name: "relations.json", labelKey: "fileRelations", count: dataset.relations.length },
    { name: "sources.json", labelKey: "fileSources", count: dataset.sources.length },
    { name: "topics.json", labelKey: "fileTopics", count: dataset.topics.length },
    { name: "budgets.json", labelKey: "fileBudgets", count: dataset.budgets.length },
    { name: "changes.json", labelKey: "fileChanges", count: dataset.changes.length },
    { name: "news.json", labelKey: "fileNews", count: dataset.news.length },
    { name: "governments.json", labelKey: "fileGovernments", count: dataset.governments.length },
    { name: "media.json", labelKey: "fileMedia", count: dataset.media.length },
    { name: "meta.json", labelKey: "fileMeta", count: null },
  ];

  const version = meta.datasetVersion ?? "v1";
  const snapshot = meta.snapshotId !== null ? formatDate(meta.snapshotId) : null;
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
        <Section id="inhoud" titleKey="datasetContentsTitle">
          <p>
            <T
              area="pages"
              k="datasetContentsP1"
              vars={{
                snapshot: snapshot ?? getS("pages", "datasetSnapshotUnknown"),
                organizations: formatCount(dataset.organizations.length),
                positions: formatCount(dataset.positions.length),
                people: formatCount(dataset.people.length),
                tenures: formatCount(dataset.tenures.length),
                memberships: formatCount(dataset.memberships.length),
                relations: formatCount(dataset.relations.length),
                sources: formatCount(dataset.sources.length),
                topics: formatCount(dataset.topics.length),
                budgets: formatCount(dataset.budgets.length),
                changes: formatCount(dataset.changes.length),
                news: formatCount(dataset.news.length),
              }}
            />
          </p>
          <p>
            <T area="pages" k="datasetContentsP2" />
          </p>
        </Section>

        <Section id="momentopname" titleKey="datasetVersionTitle">
          <p>
            <T area="pages" k="datasetVersionP1a" /> <code>{version}</code>{" "}
            <T area="pages" k="datasetVersionP1b" />{" "}
            <time dateTime={meta.snapshotId ?? undefined}>
              {snapshot !== null ? (
                snapshot
              ) : (
                <T area="pages" k="datasetUnknownDate" />
              )}
            </time>
            <T area="pages" k="datasetVersionP1c" />
          </p>
        </Section>

        <Section id="licentie" titleKey="datasetLicenseTitle">
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

        <Section id="naamsvermelding" titleKey="datasetAttributionTitle">
          <p>
            <T area="pages" k="datasetAttributionP1" vars={{ site: SITE_NAME }} />
          </p>
          <p className="rounded-md border border-line bg-surface-raised px-3 py-2 font-mono text-xs leading-relaxed text-ink">
            {citation}
          </p>
          <p className="text-xs text-ink-faint">
            <T area="pages" k="datasetPhotoCredits" />
          </p>
        </Section>

        <Section id="downloaden" titleKey="datasetDownloadTitle">
          <p>
            <T area="pages" k="datasetDownloadPre" />{" "}
            <a
              href="/data/v1/manifest.json"
              className="text-accent-text underline-offset-2 hover:underline"
            >
              /data/v1/manifest.json
            </a>
            <T area="pages" k="datasetDownloadPost" />
          </p>
          <List>
            {files.map((file) => (
              <li key={file.name}>
                <a
                  href={`/data/v1/${file.name}`}
                  className="text-accent-text underline-offset-2 hover:underline"
                >
                  <T area="pages" k={file.labelKey} />
                </a>{" "}
                <span className="text-ink-faint">
                  {file.name}
                  {file.count !== null ? (
                    <>
                      , <T area="pages" k="recordsCount" vars={{ n: formatCount(file.count) }} />
                    </>
                  ) : null}
                </span>
              </li>
            ))}
            <li>
              <a
                href="/data/v1/LICENSE-DATA.txt"
                className="text-accent-text underline-offset-2 hover:underline"
              >
                <T area="pages" k="fileLicenseData" />
              </a>{" "}
              <span className="text-ink-faint">LICENSE-DATA.txt</span>
            </li>
            <li>
              <a
                href="/data/v1/LICENSE.txt"
                className="text-accent-text underline-offset-2 hover:underline"
              >
                <T area="pages" k="fileLicenseCode" />
              </a>{" "}
              <span className="text-ink-faint">LICENSE.txt</span>
            </li>
          </List>
        </Section>

        <Section id="onafhankelijk" titleKey="datasetIndependenceTitle">
          <p>
            <T area="pages" k="datasetIndependenceP1" vars={{ site: SITE_NAME }} />
          </p>
        </Section>
      </div>

    </>
  );
}
