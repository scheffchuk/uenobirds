import type { Metadata } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { RootShell } from "@/components/site/RootShell";
import { MorphingCornerMenu } from "@/components/site/MorphingCornerMenu";
import { BottomViewSwitcher } from "@/components/site/BottomViewSwitcher";
import { OfflineIndicator } from "@/components/site/offline-indicator";
import { pickClientMessages } from "@/i18n/client-messages";
import { toHtmlLang } from "@/i18n/html-lang";
import { routing, type AppLocale } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "Birds in Ueno",
  description:
    "A seasonal guide to the wild birds of Ueno Park and Shinobazu Pond — the more often a bird visits, the larger it appears.",
  appleWebApp: {
    title: "Birds in Ueno",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal?: React.ReactNode;
}) {
  const [localeRaw, messages, tNav] = await Promise.all([
    getLocale(),
    getMessages(),
    getTranslations("Nav"),
  ]);
  const locale = localeRaw as AppLocale;

  const menuCopy = {
    menu: tNav("menu"),
    about: tNav("about"),
  };
  const switcherCopy = {
    collage: tNav("collage"),
    atlas: tNav("atlas"),
    ariaLabel: tNav("viewSwitcher"),
  };

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
            <MorphingCornerMenu copy={menuCopy} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          {modal}
          <Suspense fallback={null}>
            <BottomViewSwitcher copy={switcherCopy} />
          </Suspense>
          <Suspense fallback={null}>
            <OfflineIndicator />
          </Suspense>
        </div>
      </NextIntlClientProvider>
    </RootShell>
  );
}
