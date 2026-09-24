import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { T } from "@/components/i18n/t";
import { getS } from "@/lib/i18n/server-strings";
import { canonical, SITE_NAME } from "@/lib/site";

/**
 * Build-time SEO stays Dutch by design: pageMetadata copy is build-time only.
 */
export const metadata: Metadata = {
  title: getS("pages", "accessTitle"),
  description:
    "Toegankelijkheidsverklaring van Staatsgraaf: het nagestreefde niveau, wat al werkt, de bekende beperkingen en hoe je een probleem meldt.",
  alternates: canonical("/toegankelijkheid/"),
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

export default function AccessibilityPage() {
  return (
    <>
      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: <T area="pages" k="accessTitle" /> }]} />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        <T area="pages" k="accessTitle" />
      </h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
        <T area="pages" k="accessIntro" />
      </p>

      <div className="mt-4">
        <Section id="doel" titleKey="accessGoalTitle">
          <p>
            <T area="pages" k="accessGoalP1" />
          </p>
        </Section>

        <Section id="werkt" titleKey="accessWorksTitle">
          <List>
            <li>
              <T area="pages" k="accessWorks1" />
            </li>
            <li>
              <T area="pages" k="accessWorks2" />
            </li>
            <li>
              <T area="pages" k="accessWorks3" />
            </li>
            <li>
              <T area="pages" k="accessWorks4" />
            </li>
            <li>
              <T area="pages" k="accessWorks5" />
            </li>
            <li>
              <T area="pages" k="accessWorks6" />
            </li>
            <li>
              <T area="pages" k="accessWorks7" />
            </li>
            <li>
              <T area="pages" k="accessWorks8" />
            </li>
          </List>
        </Section>

        <Section id="beperkingen" titleKey="accessLimitsTitle">
          <List>
            <li>
              <T area="pages" k="accessLimits1" />
            </li>
            <li>
              <T area="pages" k="accessLimits2" />
            </li>
            <li>
              <T area="pages" k="accessLimits3" />
            </li>
            <li>
              <T area="pages" k="accessLimits4" />
            </li>
          </List>
          <p>
            <T area="pages" k="accessLimitsOutro" />
          </p>
        </Section>

        <Section id="melden" titleKey="accessReportTitle">
          <p>
            <T area="pages" k="accessReportP1" />
          </p>
        </Section>

        <Section id="herziening" titleKey="accessReviewTitle">
          <p>
            <T area="pages" k="accessReviewP1" />
          </p>
        </Section>
      </div>

      <p className="py-6 text-xs text-ink-faint">
        <T area="pages" k="seeAlso" />{" "}
        <Link href="/methodiek/" className="text-accent-text underline-offset-2 hover:underline">
          <T area="pages" k="linkMethodology" />
        </Link>{" "}
        <T area="pages" k="andWord" />{" "}
        <Link href="/privacy/" className="text-accent-text underline-offset-2 hover:underline">
          <T area="pages" k="linkPrivacy" />
        </Link>
        .
      </p>
    </>
  );
}
