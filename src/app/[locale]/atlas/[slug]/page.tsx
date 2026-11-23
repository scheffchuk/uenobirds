import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { loadListedSpecies } from "@/lib/guide/load-listed-species";
import { longFormForLocale, nameStackForLocale } from "@/lib/locale/species";
import { AtlasDetailView } from "./AtlasDetailView";
import {
  LocaleChromeBar,
  LocaleChromeBarFallback,
} from "@/components/site/LocaleChromeBar";
import { LocaleSiteFooter } from "@/components/site/LocaleSiteFooter";
import { SiteFooterFallback } from "@/components/site/SiteFooter";
import { SeasonLink } from "@/components/season/SeasonLink";
import { AnimatedSuspense } from "@/components/ui/animated-suspense";
import { loadMessages } from "@/i18n/load-messages";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [localeRaw, t, species] = await Promise.all([
    getLocale(),
    getTranslations("AtlasDetail"),
    loadListedSpecies(slug),
  ]);
  const locale = localeRaw as AppLocale;
  if (!species) {
    return { title: t("notFound") };
  }
  const stack = nameStackForLocale(species, locale);
  const description = longFormForLocale(species, "description", locale);
  return {
    title: `${stack.primary} · ${stack.secondary[0] ?? stack.scientific}`,
    ...(description ? { description } : {}),
  };
}

async function detailChromeCopy(locale: AppLocale) {
  "use cache";
  cacheLife("max");
  const messages = await loadMessages(locale);
  return {
    backToAtlas: messages.Nav.backToAtlas,
  };
}

async function AtlasSpeciesChrome() {
  const locale = (await getLocale()) as AppLocale;
  const copy = await detailChromeCopy(locale);

  return (
    <LocaleChromeBar
      leading={
        <SeasonLink
          pathname="/atlas"
          backLabel={copy.backToAtlas}
          prefetch={true}
          className="self-start"
        />
      }
      trailing={null}
    />
  );
}

async function AtlasSpeciesBody({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [localeRaw, species] = await Promise.all([
    getLocale(),
    loadListedSpecies(slug),
  ]);
  if (!species) notFound();

  return <AtlasDetailView species={species} locale={localeRaw as AppLocale} />;
}

function AtlasDetailSkeleton() {
  return (
    <div
      className="postcard-sheet mx-auto grid w-full max-w-[820px] grid-cols-1 gap-1.5 p-1.5 sm:gap-2 sm:p-2 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]"
      aria-hidden
    >
      <div className="postcard-visual-panel min-h-64 sm:min-h-72 md:min-h-[440px]" />
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <div className="postcard-panel postcard-identity-panel flex h-24 flex-col justify-between p-5">
          <div className="h-7 w-2/3 rounded-md bg-paper-2" />
          <div className="h-4 w-1/2 rounded-md bg-paper-2" />
        </div>
        <div className="postcard-panel postcard-tail-panel flex min-h-64 flex-1 flex-col gap-3 p-5">
          <div className="h-6 w-24 rounded-md bg-paper-2" />
          <div className="flex flex-col gap-2">
            <div className="h-3.5 w-full rounded bg-paper-2" />
            <div className="h-3.5 w-11/12 rounded bg-paper-2" />
            <div className="h-3.5 w-4/5 rounded bg-paper-2" />
          </div>
          <div className="mt-auto grid grid-cols-4 gap-3 border-t border-hairline/70 pt-3">
            {[0, 1, 2, 3].map((col) => (
              <div key={col} className="h-5 rounded bg-paper-2" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AtlasSpeciesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <>
      <article className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-6 pt-4 pb-4 md:px-8 md:pt-5">
        <AnimatedSuspense
          fallback={<LocaleChromeBarFallback showTrailing={false} />}
        >
          <AtlasSpeciesChrome />
        </AnimatedSuspense>
        <AnimatedSuspense fallback={<AtlasDetailSkeleton />}>
          <AtlasSpeciesBody params={params} />
        </AnimatedSuspense>
      </article>
      <Suspense fallback={<SiteFooterFallback />}>
        <LocaleSiteFooter />
      </Suspense>
    </>
  );
}
