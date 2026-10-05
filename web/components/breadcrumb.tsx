"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useT } from "./i18n/use-t";

/**
 * One step of the trail. Every step except the last takes an `href`, which
 * makes it a link ("Staatsgraaf / Personen / Rob Jetten" links the first two);
 * the last step is the current page and never a link.
 */
export type BreadcrumbItem = {
  label: ReactNode;
  href?: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const t = useT("common");

  return (
    <nav aria-label={t("breadcrumbAria")}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-x-2">
              {item.href !== undefined && !isLast ? (
                <Link
                  href={item.href}
                  className="tap-target inline-flex items-center underline-offset-2 hover:text-ink hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="tap-row inline-flex items-center">
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <span aria-hidden="true" className="text-ink-faint">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
