import type { Metadata } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { RootShell } from "@/components/site/RootShell";
import {
  LocaleChromeBar,
  LocaleChromeBarFallback,
} from "@/components/site/LocaleChromeBar";
import { LocaleSiteFooter } from "@/components/site/LocaleSiteFooter";
import { SiteFooterFallback } from "@/components/site/SiteFooter";
import { OfflineIndicator } from "@/components/site/offline-indicator";
import { pickClientMessages } from "@/i18n/client-messages";
import { toHtmlLang } from "@/i18n/html-lang";
import { routing, type AppLocale } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "Birds in Ueno",
  description:
    "A curated bird guide for Ueno Park and Shinobazu Pond — collage sized by seasonal Prevalence.",
  appleWebApp: {
    title: "Birds in Ueno",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [localeRaw, messages] = await Promise.all([getLocale(), getMessages()]);
  const locale = localeRaw as AppLocale;

  return (
    <RootShell lang={toHtmlLang(locale)}>
      <NextIntlClientProvider
        locale={locale}
        messages={pickClientMessages(messages)}
      >
        <div className="flex min-h-screen flex-col bg-background">
          <div
            className="fixed top-4 right-4 z-40 md:top-5 md:right-7"
            style={{ viewTransitionName: "site-header" }}
          >
            <Suspense
              fallback={<LocaleChromeBarFallback showLeading={false} />}
            >
              <LocaleChromeBar />
            </Suspense>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <Suspense fallback={<SiteFooterFallback />}>
            <LocaleSiteFooter />
          </Suspense>
          <Suspense fallback={null}>
            <OfflineIndicator />
          </Suspense>
        </div>
      </NextIntlClientProvider>
    </RootShell>
  );
}
