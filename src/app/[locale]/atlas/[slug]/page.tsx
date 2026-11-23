import type { Metadata } from "next";
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
      className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-x-14 lg:gap-y-8"
      aria-hidden
    >
      <div className="flex flex-col gap-1 lg:col-span-full">
        <div className="h-9 w-2/3 rounded-lg bg-paper-2 md:h-10" />
        <div className="h-7 w-1/3 rounded-md bg-paper-2" />
        <div className="h-7 w-1/3 rounded-md bg-paper-2" />
        <div className="h-5 w-1/4 rounded-md bg-paper-2" />
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="aspect-square w-full max-w-60 rounded-xl bg-paper-2 sm:max-w-80 lg:max-w-100" />
        <div className="h-8 w-36 rounded-lg bg-paper-2" />
      </div>
      <div className="flex flex-col gap-8">
        {[0, 1].map((section) => (
          <div key={section} className="flex flex-col gap-4">
            <div className="h-7 w-32 rounded-md bg-paper-2" />
            <div className="flex flex-col gap-3">
              {[0, 1, 2, 3].map((line) => (
                <div key={line} className="h-4 rounded-md bg-paper-2" />
              ))}
            </div>
          </div>
        ))}
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
    <article className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-6 pt-4 pb-10 md:px-8 md:pt-5">
      <AnimatedSuspense
        fallback={<LocaleChromeBarFallback showTrailing={false} />}
      >
        <AtlasSpeciesChrome />
      </AnimatedSuspense>
      <AnimatedSuspense fallback={<AtlasDetailSkeleton />}>
        <AtlasSpeciesBody params={params} />
      </AnimatedSuspense>
    </article>
  );
}
