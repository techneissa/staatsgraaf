import type { Metadata, Viewport } from "next";
import { ViewTransition, type ReactNode } from "react";
import "./globals.css";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { CanvasFrame } from "@/components/canvas-frame";
import { SelectionProvider } from "@/components/selection/selection-provider";
import { SelectionProfile } from "@/components/panels/selection-profile";
import { Workspace } from "@/components/panels/workspace";
import { PANELS_INIT_SCRIPT } from "@/components/panels/panel-prefs";
import { PeekProvider } from "@/components/peek/peek-provider";
import { RevealObserver } from "@/components/reveal-observer";
import { SiteFooter } from "@/components/site-footer";
import { SkipLink } from "@/components/skip-link";
import { TopBar } from "@/components/top-bar";
import { getDatasetDate } from "@/lib/data";
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
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const datasetDate = getDatasetDate();

  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: PANELS_INIT_SCRIPT }} />
      </head>
      <body>
        <LanguageProvider>
          <SkipLink />
          <SelectionProvider>
            <div className="flex min-h-dvh flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden">
              <TopBar />
              {/* Three columns from lg (page, canvas, details), one stack below it;
                  the grid and the stored column choices live in Workspace. */}
              <Workspace canvas={<CanvasFrame />}>
                {/* Below lg the column is the full screen width: pad it clear of the
                    notch in landscape and cap the measure so lines stay readable on
                    an iPad in portrait. From lg the column is at most 32rem already. */}
                <main
                  id="inhoud"
                  tabIndex={-1}
                  className="@container flex-1 pb-10 pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-6 lg:pl-[max(2rem,var(--safe-left))] lg:pr-8"
                >
                  <div className="mx-auto w-full max-w-[44rem] lg:mx-0 lg:max-w-none">
                    {/* What is picked on the canvas, above the page; it does not
                        take part in the page transition. */}
                    <SelectionProfile />
                    {/* The page column cross-fades on navigation (globals.css, "Page
                        transitions"); nothing else on the page takes part. */}
                    <ViewTransition update="sg-page" default="none">
                      <div>{children}</div>
                    </ViewTransition>
                  </div>
                </main>
                <SiteFooter datasetDate={datasetDate} />
              </Workspace>
            </div>
          </SelectionProvider>
          <PeekProvider />
          <RevealObserver />
        </LanguageProvider>
      </body>
    </html>
  );
}
