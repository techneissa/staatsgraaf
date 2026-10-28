import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, MessageSquareWarning, type IconNode } from "lucide";
import { Breadcrumb } from "@/components/breadcrumb";
import { SectionHeading } from "@/components/icons/section-heading";
import { T } from "@/components/i18n/t";
import { IssuesLink } from "@/components/issues-link";
import { getS } from "@/lib/i18n/server-strings";
import { canonical, SITE_NAME } from "@/lib/site";

/**
 * Build-time SEO stays Dutch by design: pageMetadata copy is build-time only.
 */
export const metadata: Metadata = {
  title: getS("pages", "accessTitle"),
  description:
    "Toegankelijkheidsverklaring van Staatsgraaf: wat werkt, de bekende beperkingen en hoe je een probleem meldt.",
  alternates: canonical("/toegankelijkheid/"),
};

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
        <Section id="werkt" titleKey="accessWorksTitle" icon={CircleCheck}>
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
          </List>
        </Section>

        <Section id="beperkingen" titleKey="accessLimitsTitle" icon={CircleAlert}>
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
          </List>
        </Section>

        <Section id="melden" titleKey="accessReportTitle" icon={MessageSquareWarning}>
          <p>
            <T area="pages" k="accessReportPre" /> <IssuesLink />
            <T area="pages" k="accessReportPost" />
          </p>
        </Section>
      </div>
    </>
  );
}
