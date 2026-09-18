import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { T } from "@/components/i18n/t";
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
  return (
    <>
      <nav aria-label="Kruimelpad">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
          <li className="flex items-center gap-x-2">
            <Link href="/" className="underline-offset-2 hover:text-ink hover:underline">
              {SITE_NAME}
            </Link>
            <span aria-hidden="true" className="text-ink-faint">
              /
            </span>
          </li>
          <li className="flex items-center gap-x-2">
            <span aria-current="page">
              <T area="pages" k="methodTitle" />
            </span>
          </li>
        </ol>
      </nav>
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
            <T area="pages" k="methodAiP4" />
          </p>
        </Section>

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
