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
  title: getS("pages", "privacyTitle"),
  description:
    "Privacyverklaring van Staatsgraaf: welke gegevens de site wel en niet verwerkt, op welke grondslag dat gebeurt, en hoe correctie of verwijdering werkt.",
  alternates: canonical("/privacy/"),
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

export default function PrivacyPage() {
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
              <T area="pages" k="privacyTitle" />
            </span>
          </li>
        </ol>
      </nav>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        <T area="pages" k="privacyTitle" />
      </h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
        <T area="pages" k="privacyIntro" />
      </p>

      <div className="mt-4">
        <Section id="niet" titleKey="privacyNotTitle">
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

        <Section id="dataset" titleKey="privacyDatasetTitle">
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

        <Section id="logs" titleKey="privacyLogsTitle">
          <p>
            <T area="pages" k="privacyLogsP1" />
          </p>
        </Section>

        <Section id="bewaren" titleKey="privacyRetentionTitle">
          <p>
            <T area="pages" k="privacyRetentionP1" />
          </p>
        </Section>

        <Section id="correctie" titleKey="privacyCorrectionTitle">
          <p>
            <T area="pages" k="privacyCorrectionP1" />
          </p>
          <p>
            <T area="pages" k="privacyCorrectionP2" />
          </p>
        </Section>

        <Section id="verantwoordelijke" titleKey="privacyControllerTitle">
          <p>
            <T area="pages" k="privacyControllerP1" />
          </p>
        </Section>
      </div>

      <p className="py-6 text-xs text-ink-faint">
        <T area="pages" k="privacyFooterPre" />{" "}
        <Link href="/methodiek/" className="text-accent-text underline-offset-2 hover:underline">
          <T area="pages" k="linkMethodology" />
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
