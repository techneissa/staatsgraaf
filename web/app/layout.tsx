import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { CanvasFrame } from "@/components/canvas-frame";
import { SelectionProvider } from "@/components/selection/selection-provider";
import { SelectionProfileGate } from "@/components/selection/selection-profile-gate";
import { Workspace } from "@/components/panels/workspace";
import { PANELS_INIT_SCRIPT } from "@/components/panels/panel-prefs";
import { NavRecovery } from "@/components/nav-recovery";
import { NavScroll } from "@/components/nav-scroll";
import { FloatingBack } from "@/components/history-controls";
import { SwipeBack } from "@/components/swipe-back";
import { PeekProvider } from "@/components/peek/peek-provider";
import { RevealObserver } from "@/components/reveal-observer";
import { SiteFooter } from "@/components/site-footer";
import { SkipLink } from "@/components/skip-link";
import { TopBar } from "@/components/top-bar";
import { getDatasetDate } from "@/lib/data";
import { CANVAS_INIT_SCRIPT } from "@/lib/canvas-prefs";
import { SITE_NAME, SITE_TAGLINE, SITE_URL, THEME_INIT_SCRIPT } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  openGraph: {
    type: "website",
    locale: "nl_NL",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_TAGLINE,
  },
};

/**
 * viewport-fit=cover lets the page draw under the iPhone notch and home
 * indicator; the top bar, the bottom sheet and the footer pad themselves with
 * env(safe-area-inset-*) so nothing sits under them.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0D" },
    { media: "(prefers-color-scheme: light)", color: "#FAF9EE" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const datasetDate = getDatasetDate();

  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: PANELS_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: CANVAS_INIT_SCRIPT }} />
      </head>
      <body>
        <LanguageProvider>
          <SkipLink />
          <NavRecovery />
          <SelectionProvider>
            {/* svh, not dvh: iOS dvh tracks the URL bar and reflows the page while you scroll. */}
            <div className="flex min-h-svh flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden">
              <TopBar />
              {/* From lg: page, optional canvas, details. The canvas starts closed
                  so the page can use the full width (ADR 0018, 18-10-2026). Below
                  md the home graph still leads; from md the page is first. */}
              <Workspace canvas={<CanvasFrame />}>
                {/* Below md the column is the screen width with a readable measure.
                    From md it is a container that fills whatever the workspace
                    leaves, so news and indexes can go two or three across. */}
                <main
                  id="inhoud"
                  tabIndex={-1}
                  className="@container flex-1 pb-10 pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-6 md:pl-[max(1.5rem,var(--safe-left))] md:pr-6 lg:pl-[max(2rem,var(--safe-left))] lg:pr-8"
                >
                  <div className="mx-auto w-full max-w-[44rem] md:mx-0 md:max-w-none">
                    {/* What is picked on the canvas, above the page; it does not
                        take part in the page transition. */}
                    <SelectionProfileGate />
                    {/* The page itself, wrapped and cross-faded by app/template.tsx. */}
                    {children}
                  </div>
                </main>
                <SiteFooter datasetDate={datasetDate} />
              </Workspace>
            </div>
            <NavScroll />
            {/* Back on touch screens: a swipe to the right anywhere on the page,
                and on phones a button in reach of the thumb. */}
            <SwipeBack />
            <FloatingBack />
          </SelectionProvider>
          <PeekProvider />
          <RevealObserver />
        </LanguageProvider>
      </body>
    </html>
  );
}
