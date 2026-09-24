import Link from "next/link";
import { T } from "@/components/i18n/t";
import { UpdatedStamp } from "./updated-stamp";

export function SiteFooter({ datasetDate }: { datasetDate: string | null }) {
  return (
    <footer className="border-t border-line pb-[max(1.5rem,var(--safe-bottom))] pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-6 lg:pl-[max(2rem,var(--safe-left))] lg:pr-8">
      <div className="mx-auto w-full max-w-[44rem] lg:mx-0 lg:max-w-none">
      <nav aria-labelledby="voettekst-titel">
        <h2 id="voettekst-titel" className="sr-only">
          <T area="graph" k="footerNav" />
        </h2>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm sm:gap-y-2">
          <li>
            <Link
              href="/methodiek/"
              className="tap-row inline-flex items-center text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              <T area="pages" k="linkMethodology" />
            </Link>
          </li>
          <li>
            <Link
              href="/privacy/"
              className="tap-row inline-flex items-center text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              <T area="pages" k="linkPrivacy" />
            </Link>
          </li>
          <li>
            <Link
              href="/toegankelijkheid/"
              className="tap-row inline-flex items-center text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              <T area="pages" k="linkAccessibility" />
            </Link>
          </li>
          <li>
            <Link
              href="/dataset/"
              className="tap-row inline-flex items-center text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              <T area="pages" k="linkDataset" />
            </Link>
          </li>
        </ul>
      </nav>
      <p className="mt-4 text-xs text-ink-faint">
        <T area="pages" k="footerIndependent" />
      </p>
      <UpdatedStamp datasetDate={datasetDate} />
      </div>
    </footer>
  );
}
