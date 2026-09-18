import Link from "next/link";
import { T } from "@/components/i18n/t";

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
    </>
  );
}
