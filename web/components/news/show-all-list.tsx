import type { ReactNode } from "react";
import { DateT } from "@/components/content/local-date";
import { T } from "@/components/i18n/t";
import { DisclosureChevron } from "@/components/icons/disclosure-chevron";
import { formatCountIn } from "@/lib/format";
import { PAGES_DICT } from "@/lib/i18n/dict-pages";
import { interpolate } from "@/lib/i18n/locales";

/**
 * A long list that shows its first items and folds the rest into a native
 * disclosure ("Toon alle 212"). Server-rendered, no script: every item is in
 * the HTML, so find-in-page, crawlers and readers without JavaScript still
 * reach it. Short lists render whole; a list is only folded when that hides
 * at least `minHidden` items.
 *
 * `locale` pins the button text for the fixed-language /news/ routes; without
 * it the text follows the site language.
 */
export function ShowAllList<Item>({
  items,
  initial = 12,
  minHidden = 6,
  as: List = "ul",
  className,
  itemClassName,
  keyOf,
  render,
  locale,
}: {
  items: Item[];
  initial?: number;
  minHidden?: number;
  as?: "ul" | "ol";
  className: string;
  itemClassName?: string;
  keyOf: (item: Item) => string;
  render: (item: Item) => ReactNode;
  locale?: "nl" | "en";
}) {
  const fold = items.length - initial >= minHidden;
  const head = fold ? items.slice(0, initial) : items;
  const rest = fold ? items.slice(initial) : [];

  const renderItems = (list: Item[]) =>
    list.map((item) => (
      <li key={keyOf(item)} className={itemClassName}>
        {render(item)}
      </li>
    ));

  return (
    <>
      <List className={className}>{renderItems(head)}</List>
      {rest.length > 0 ? (
        <details className="motion-disclosure group mt-3">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-pill border border-line bg-surface-raised px-4 text-sm font-medium text-ink transition-fast hover:border-accent/40 hover:bg-accent-soft hover:text-accent-text sm:min-h-9 pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">
              {locale !== undefined ? (
                interpolate(PAGES_DICT.listShowAll[locale], { count: formatCountIn(items.length, locale) })
              ) : (
                <DateT area="pages" k="listShowAll" counts={{ count: items.length }} />
              )}
            </span>
            <span className="hidden group-open:inline">
              {locale !== undefined ? PAGES_DICT.listShowLess[locale] : <T area="pages" k="listShowLess" />}
            </span>
            <DisclosureChevron />
          </summary>
          <List className={className} start={List === "ol" ? head.length + 1 : undefined}>
            {renderItems(rest)}
          </List>
        </details>
      ) : null}
    </>
  );
}
