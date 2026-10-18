import type { ReactNode } from "react";
import Link from "next/link";
import type { IconNode } from "lucide";
import { Accessibility, CalendarDays, Code, Database, Info, Scale, Shield } from "lucide";
import { T } from "@/components/i18n/t";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { UpdatedStamp } from "./updated-stamp";

const CHIP =
  "tap-target flex min-h-9 w-full min-w-0 items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-sm font-medium text-ink transition-fast hover:border-line-strong hover:bg-surface-inset";

const META =
  "tap-target inline-flex min-h-9 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-xs font-medium text-ink-muted transition-fast hover:bg-surface-inset hover:text-ink";

const PAGES = [
  { href: "/methodiek/", area: "common", key: "navAbout", icon: Info, color: "var(--kind-topic)" },
  { href: "/privacy/", area: "pages", key: "linkPrivacy", icon: Shield, color: "var(--kind-person)" },
  { href: "/toegankelijkheid/", area: "pages", key: "linkAccessibility", icon: Accessibility, color: "var(--kind-place)" },
  { href: "/dataset/", area: "pages", key: "linkDataset", icon: Database, color: "var(--kind-organization)" },
] as const;

function Mark({ color, icon }: { color: string; icon: IconNode }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 34%, transparent)`,
      }}
    >
      <LucideIcon icon={icon} size={13} strokeWidth={2} />
    </span>
  );
}

function MetaGlyph({ color, icon }: { color: string; icon: IconNode }) {
  return (
    <span aria-hidden="true" className="mt-px inline-flex shrink-0" style={{ color }}>
      <LucideIcon icon={icon} size={14} strokeWidth={2} />
    </span>
  );
}

function MetaItem({ children }: { children: ReactNode }) {
  return <span className="inline-flex min-w-0 max-w-full items-start gap-1.5 py-1.5 text-xs leading-snug text-ink-muted">{children}</span>;
}

export function SiteFooter({ datasetDate }: { datasetDate: string | null }) {
  return (
    <footer className="border-t border-line pb-[max(1.25rem,var(--safe-bottom))] pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-4 max-sm:pb-[max(4.75rem,calc(var(--safe-bottom)+3.75rem))] lg:pl-[max(2rem,var(--safe-left))] lg:pr-8">
      <div className="mx-auto w-full max-w-[44rem] lg:mx-0 lg:max-w-none">
        <nav aria-labelledby="voettekst-navigatie">
          <span id="voettekst-navigatie" className="sr-only">
            <T area="common" k="footerNavigation" />
          </span>
          <ul className="grid grid-cols-2 gap-1.5">
            {PAGES.map((item) => (
              <li key={item.href} className="min-w-0">
                <Link href={item.href} className={CHIP}>
                  <Mark color={item.color} icon={item.icon} />
                  <span className="min-w-0 text-start leading-snug">
                    <T area={item.area} k={item.key} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-line pt-2">
          <a href="/data/v1/LICENSE-DATA.txt" className={META}>
            <MetaGlyph color="var(--t-color-sector-rechterlijke-macht)" icon={Scale} />
            <T area="common" k="footerLicenseData" />
          </a>
          <a href="/data/v1/LICENSE.txt" className={META}>
            <MetaGlyph color="var(--kind-position)" icon={Code} />
            <T area="common" k="footerLicenseCode" />
          </a>
          <MetaItem>
            <T area="pages" k="footerIndependent" />
          </MetaItem>
          <MetaItem>
            <MetaGlyph color="var(--kind-party)" icon={CalendarDays} />
            <UpdatedStamp datasetDate={datasetDate} />
          </MetaItem>
        </div>
      </div>
    </footer>
  );
}
