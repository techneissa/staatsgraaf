import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/components/i18n/t";
import { getS } from "@/lib/i18n/server-strings";
import { SECTIONS } from "@/lib/site-nav";

export const metadata: Metadata = {
  title: getS("pages", "notFoundTitle"),
  description: getS("common", "notFoundDescription"),
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        <T area="pages" k="notFoundTitle" />
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        <T area="pages" k="notFoundPre" />{" "}
        <Link href="/" className="text-accent-text underline-offset-2 hover:underline">
          <T area="pages" k="linkHome" />
        </Link>
        .
      </p>
      <section aria-labelledby="niet-gevonden-onderdelen" className="mt-6">
        <h2 id="niet-gevonden-onderdelen" className="text-sm font-medium text-ink">
          <T area="common" k="notFoundSections" />
        </h2>
        <ul className="mt-2 grid grid-cols-2 gap-x-4">
          {SECTIONS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="tap-row flex min-h-9 items-center text-sm text-accent-text underline-offset-2 hover:underline"
              >
                <T area="common" k={item.label} />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-muted">
          <T area="common" k="notFoundSearchHint" />
        </p>
      </section>
    </>
  );
}
