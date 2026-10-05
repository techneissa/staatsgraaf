import Link from "next/link";

/**
 * Shown only without JavaScript, where an index list holds just its first
 * screen: says so in both languages and points to the complete data. Both
 * languages are literal because a noscript block is static markup and cannot
 * follow the stored language.
 */
export function NoScriptNote() {
  return (
    <noscript>
      <p lang="nl" className="mt-3 text-sm text-ink-muted">
        Zonder JavaScript toont deze lijst alleen de eerste items. De volledige gegevens staan op de{" "}
        <Link href="/dataset/" className="text-accent-text underline underline-offset-2">
          datasetpagina
        </Link>
        .
      </p>
      <p lang="en" className="mt-1 text-sm text-ink-muted">
        Without JavaScript this list shows only the first items. The complete data is on the{" "}
        <Link href="/dataset/" className="text-accent-text underline underline-offset-2">
          dataset page
        </Link>
        .
      </p>
    </noscript>
  );
}
