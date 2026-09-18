import Link from "next/link";
import { T } from "@/components/i18n/t";
import { UpdatedStamp } from "./updated-stamp";

export function SiteFooter({ datasetDate }: { datasetDate: string | null }) {
  return (
    <footer className="border-t border-line px-4 py-6 lg:px-8">
      <nav aria-label="Voettekst / Footer">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li>
            <Link
              href="/methodiek/"
              className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              <T area="pages" k="linkMethodology" />
            </Link>
          </li>
          <li>
            <Link
              href="/privacy/"
              className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              <T area="pages" k="linkPrivacy" />
            </Link>
          </li>
          <li>
            <Link
              href="/toegankelijkheid/"
              className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              <T area="pages" k="linkAccessibility" />
            </Link>
          </li>
          <li>
            <Link
              href="/dataset/"
              className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
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
    </footer>
  );
}
