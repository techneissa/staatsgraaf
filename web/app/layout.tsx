import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { CanvasFrame } from "@/components/canvas-frame";
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

export default function RootLayout({ children }: { children: ReactNode }) {
  const datasetDate = getDatasetDate();

  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <LanguageProvider>
          <SkipLink />
          <div className="flex min-h-dvh flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden">
            <TopBar />
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
            <CanvasFrame />
            <div className="flex min-h-0 min-w-0 flex-col lg:col-start-1 lg:row-start-1 lg:overflow-y-auto">
              <main id="inhoud" tabIndex={-1} className="flex-1 px-4 pb-10 pt-6 lg:px-8">
                {children}
              </main>
              <SiteFooter datasetDate={datasetDate} />
            </div>
          </div>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
