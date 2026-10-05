import Link from "next/link";
import { T } from "@/components/i18n/t";
import { UpdatedStamp } from "./updated-stamp";

/** Every footer link is a 44 px target on touch (min size from the tap-target utility) and its text on a mouse. */
const LINK =
  "tap-target inline-flex items-center justify-center px-1 text-ink-muted underline-offset-2 hover:text-ink hover:underline";

const PAGES = [
  { href: "/methodiek/", area: "common", key: "navAbout" },
  { href: "/privacy/", area: "pages", key: "linkPrivacy" },
  { href: "/toegankelijkheid/", area: "pages", key: "linkAccessibility" },
  { href: "/dataset/", area: "pages", key: "linkDataset" },
] as const;

export function SiteFooter({ datasetDate }: { datasetDate: string | null }) {
  return (
    <footer className="border-t border-line pb-[max(1.5rem,var(--safe-bottom))] pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-4 lg:pl-[max(2rem,var(--safe-left))] lg:pr-8">
      <div className="mx-auto w-full max-w-[44rem] lg:mx-0 lg:max-w-none">
        <nav aria-labelledby="voettekst-navigatie">
          <span id="voettekst-navigatie" className="sr-only">
            <T area="common" k="footerNavigation" />
          </span>
          <ul className="-mx-1 flex flex-wrap gap-x-3 text-sm">
            {PAGES.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={LINK}>
                  <T area={item.area} k={item.key} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* The data licence and the source credit (docs/12, part 2), on one line. */}
        <ul className="-mx-1 mt-1 flex flex-wrap items-center gap-x-3 text-xs text-ink-faint">
          <li>
            <a href="/data/v1/LICENSE-DATA.txt" className={LINK}>
              <T area="common" k="footerLicenseData" />
            </a>
          </li>
          <li>
            <a href="/data/v1/LICENSE.txt" className={LINK}>
              <T area="common" k="footerLicenseCode" />
            </a>
          </li>
          <li className="px-1">
            <T area="common" k="footerSourceNote" />
          </li>
          <li>
            <Link href="/dataset/" className={LINK}>
              <T area="common" k="footerDatasetLink" />
            </Link>
          </li>
        </ul>
        <p className="mt-3 text-xs text-ink-faint">
          <T area="pages" k="footerIndependent" />
        </p>
        <UpdatedStamp datasetDate={datasetDate} />
      </div>
    </footer>
  );
}
