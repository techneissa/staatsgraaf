import Link from "next/link";
import { UpdatedStamp } from "./updated-stamp";

export function SiteFooter({ datasetDate }: { datasetDate: string | null }) {
  return (
    <footer className="border-t border-line px-4 py-6 lg:px-8">
      <nav aria-label="Voettekst">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li>
            <Link
              href="/methodiek/"
              className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Methodiek
            </Link>
          </li>
          <li>
            <Link
              href="/privacy/"
              className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Privacy
            </Link>
          </li>
          <li>
            <Link
              href="/toegankelijkheid/"
              className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Toegankelijkheid
            </Link>
          </li>
          <li>
            <Link
              href="/dataset/"
              className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Dataset
            </Link>
          </li>
        </ul>
      </nav>
      <p className="mt-4 text-xs text-ink-faint">
        Onafhankelijke publicatie, niet verbonden aan de Nederlandse overheid.
      </p>
      <UpdatedStamp datasetDate={datasetDate} />
    </footer>
  );
}
