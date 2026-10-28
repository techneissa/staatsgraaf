import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Database, HardDrive, PenLine, Server, type IconNode } from "lucide";
import { Breadcrumb } from "@/components/breadcrumb";
import { LocalDate } from "@/components/content/local-date";
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
    "Privacyverklaring van Staatsgraaf: wat de site in je browser opslaat en van elders laadt, welke gegevens de dataset bevat en hoe correctie of verwijdering werkt.",
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

/** The day this statement last changed. Update it with the text. */
const UPDATED = "2026-10-28";

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
        <Section id="opslag" titleKey="privacyStoredTitle" icon={HardDrive}>
          <p>
            <T area="pages" k="privacyStoredP1" />
          </p>
          <List>
            <li>
              <T area="pages" k="privacyStored1" />
            </li>
            <li>
              <T area="pages" k="privacyStored2" />
            </li>
            <li>
              <T area="pages" k="privacyStored3" />
            </li>
            <li>
              <T area="pages" k="privacyStored4" />
            </li>
            <li>
              <T area="pages" k="privacyStored5" />
            </li>
          </List>
          <p>
            <T area="pages" k="privacyStoredP2" />
          </p>
        </Section>

        <Section id="elders" titleKey="privacyElsewhereTitle" icon={Server}>
          <p>
            <T area="pages" k="privacyElsewhereP1" />
          </p>
          <p>
            <T area="pages" k="privacyElsewhereP2" />
          </p>
        </Section>

        <Section id="gegevens" titleKey="privacyDataTitle" icon={Database}>
          <p>
            <T area="pages" k="privacyDataP1" />
          </p>
          <p>
            <T area="pages" k="privacyDataP2" />
          </p>
        </Section>

        <Section id="correctie" titleKey="privacyCorrectionTitle" icon={PenLine}>
          <p>
            <T area="pages" k="privacyCorrectionP1" />
          </p>
        </Section>
      </div>

      <p className="py-6 text-end text-xs text-ink-faint">
        <LocalDate iso={UPDATED} />
      </p>
    </>
  );
}
