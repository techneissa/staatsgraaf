"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide";
import { LucideIcon } from "./icons/lucide-icon";
import { useT } from "./i18n/use-t";
import { CIVLAB_URL, WELCOME_BANNER_ATTR, readDismissed, writeDismissed } from "@/lib/welcome-banner";

/**
 * The three statements, once, ending in a separator so the next copy follows
 * at the same spacing. The banner renders this several times so one half of
 * the scrolling track is wider than any screen: the first copy is the real
 * text, the rest are aria-hidden clones whose link is out of the tab order.
 */
function Statements({ clone }: { clone: boolean }) {
  const t = useT("common");
  return (
    <p className="sg-welcome-group" aria-hidden={clone ? true : undefined}>
      <span>{t("welcomeNotAffiliated")}</span>
      <span aria-hidden="true" className="sg-welcome-sep">
        ·
      </span>
      <span>
        {t("welcomeInspiredBy")}
        <a
          href={CIVLAB_URL}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={clone ? -1 : undefined}
          className="sg-welcome-link"
        >
          {t("welcomeInspiredLink")}
        </a>
      </span>
      <span aria-hidden="true" className="sg-welcome-sep">
        ·
      </span>
      <span>{t("welcomePurpose")}</span>
      <span aria-hidden="true" className="sg-welcome-sep sg-welcome-sep-end">
        ·
      </span>
    </p>
  );
}

/** Copies per half of the track: three of about 1100 px outrun a 2560 px screen. */
const COPIES = [0, 1, 2];

/**
 * A slim notice pill above the top bar, on every page until the reader closes
 * it. It says the project is independent, where the idea came from and why it
 * exists. The text scrolls (globals.css, "Welcome banner"); it pauses on hover
 * and on focus, and stands still and wraps under prefers-reduced-motion.
 *
 * The page is a static export, so the banner is always in the HTML. A head
 * script (lib/welcome-banner.ts) marks <html> before first paint when this
 * browser dismissed it, and a CSS rule hides it; after hydration this
 * component reads the same flag and drops the markup. The dismissal is one
 * localStorage key, nothing else: no cookie, nothing sent anywhere.
 */
export function WelcomeBanner() {
  const t = useT("common");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (readDismissed(window.localStorage)) setOpen(false);
  }, []);

  if (!open) return null;

  function dismiss() {
    document.documentElement.setAttribute(WELCOME_BANNER_ATTR, "");
    // Storage that refuses still closes it for this page view.
    writeDismissed(window.localStorage);
    setOpen(false);
  }

  return (
    <section aria-label={t("welcomeLabel")} data-welcome-banner className="sg-welcome">
      <div className="sg-welcome-pill">
        <LucideIcon icon={Info} size={14} strokeWidth={2} className="sg-welcome-icon" />
        <div className="sg-welcome-view">
          <div className="sg-welcome-track">
            <div className="sg-welcome-half">
              {COPIES.map((n) => (
                <Statements key={n} clone={n > 0} />
              ))}
            </div>
            <div className="sg-welcome-half">
              {COPIES.map((n) => (
                <Statements key={n} clone />
              ))}
            </div>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label={t("welcomeDismiss")} className="sg-welcome-close">
          <LucideIcon icon={X} size={13} strokeWidth={2.25} />
        </button>
      </div>
    </section>
  );
}
