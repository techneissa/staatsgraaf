import Link from "next/link";
import { KindBadge } from "./kind-badge";
import { ORG_BRANCH_LABELS, ORG_SUBTYPE_LABELS } from "@/lib/labels";
import type { Organization } from "@/lib/types";

export function EntityCard({ organization }: { organization: Organization }) {
  return (
    <article className="rounded-md border border-line bg-surface p-4 transition-fast hover:border-line-strong">
      <h3 className="text-sm font-semibold">
        <Link
          href={`/organisaties/${organization.slug}/`}
          className="text-ink underline-offset-2 hover:text-accent-text hover:underline"
        >
          {organization.name}
        </Link>
      </h3>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <KindBadge tone="accent">{ORG_SUBTYPE_LABELS[organization.subtype]}</KindBadge>
        <span className="text-xs text-ink-faint">{ORG_BRANCH_LABELS[organization.branch]}</span>
      </div>
      {organization.description !== null ? (
        <p className="mt-2 text-sm leading-normal text-ink-muted">{organization.description}</p>
      ) : null}
    </article>
  );
}
