"use client";

import { useEffect, useState } from "react";
import { X } from "lucide";
import { Morph } from "./icons/morph";
import { useT } from "./i18n/use-t";
import { CIVLAB_URL, WELCOME_BANNER_ATTR, readDismissed, writeDismissed } from "@/lib/welcome-banner";

/**
 * The three statements, once. The banner renders this twice: the real copy
 * and an aria-hidden clone that makes the scrolling loop seamless. The clone's
 * link is out of the tab order, so only the real copy takes focus.
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
    </p>
  );
}

/**
 * A coloured strip above the top bar, on every page until the reader closes
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
      <div className="sg-welcome-view">
        <div className="sg-welcome-track">
          <Statements clone={false} />
          <Statements clone />
        </div>
      </div>
      <button type="button" onClick={dismiss} aria-label={t("welcomeDismiss")} className="sg-welcome-close">
        <Morph icon={X} size={18} strokeWidth={2} still />
      </button>
    </section>
  );
}
