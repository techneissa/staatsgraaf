import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Clock, Database, EyeOff, PenLine, Server, UserCheck, type IconNode } from "lucide";
import { Breadcrumb } from "@/components/breadcrumb";
import { SectionHeading } from "@/components/icons/section-heading";
import { T } from "@/components/i18n/t";
import { getS } from "@/lib/i18n/server-strings";
import { canonical, SITE_NAME } from "@/lib/site";

/**
 * Build-time SEO stays Dutch by design: pageMetadata copy is build-time only.
 */
export const metadata: Metadata = {
  title: getS("pages", "privacyTitle"),
  description:
    "Privacyverklaring van Staatsgraaf: welke gegevens de site wel en niet verwerkt, op welke grondslag dat gebeurt, en hoe correctie of verwijdering werkt.",
  alternates: canonical("/privacy/"),
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

export default function PrivacyPage() {
  return (
    <>
      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: <T area="pages" k="privacyTitle" /> }]} />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        <T area="pages" k="privacyTitle" />
      </h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
        <T area="pages" k="privacyIntro" />
      </p>

      <div className="mt-4">
        <Section id="niet" titleKey="privacyNotTitle" icon={EyeOff}>
          <List>
            <li>
              <T area="pages" k="privacyNot1" />
            </li>
            <li>
              <T area="pages" k="privacyNot2" />
            </li>
            <li>
              <T area="pages" k="privacyNot3" />
            </li>
            <li>
              <T area="pages" k="privacyNot4" />
            </li>
          </List>
          <p>
            <T area="pages" k="privacyThemeNote" />
          </p>
        </Section>

        <Section id="dataset" titleKey="privacyDatasetTitle" icon={Database}>
          <p>
            <T area="pages" k="privacyDatasetP1" />
          </p>
          <p>
            <T area="pages" k="privacyDatasetP2" />
          </p>
          <p>
            <T area="pages" k="privacyDatasetP3" />
          </p>
        </Section>

        <Section id="logs" titleKey="privacyLogsTitle" icon={Server}>
          <p>
            <T area="pages" k="privacyLogsP1" />
          </p>
        </Section>

        <Section id="bewaren" titleKey="privacyRetentionTitle" icon={Clock}>
          <p>
            <T area="pages" k="privacyRetentionP1" />
          </p>
        </Section>

        <Section id="correctie" titleKey="privacyCorrectionTitle" icon={PenLine}>
          <p>
            <T area="pages" k="privacyCorrectionP1" />
          </p>
          <p>
            <T area="pages" k="privacyCorrectionP2" />
          </p>
        </Section>

        <Section id="verantwoordelijke" titleKey="privacyControllerTitle" icon={UserCheck}>
          <p>
            <T area="pages" k="privacyControllerP1" />
          </p>
        </Section>
      </div>

      <p className="py-6 text-xs text-ink-faint">
        <T area="pages" k="privacyFooterPre" />
      </p>
    </>
  );
}
