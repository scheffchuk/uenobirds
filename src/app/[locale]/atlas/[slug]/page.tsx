import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { loadListedSpecies } from "@/lib/guide/load-listed-species";
import { longFormForLocale, nameStackForLocale } from "@/lib/locale/species";
import { AtlasDetailView } from "./AtlasDetailView";
import { LocaleChromeBar, LocaleChromeBarFallback } from "@/components/site/LocaleChromeBar";
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

  return (
    <AtlasDetailView
      species={species}
      locale={localeRaw as AppLocale}
    />
  );
}

function AtlasDetailSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-hidden>
      <div className="h-10 w-2/3 bg-paper-2" />
      <div className="aspect-square w-full max-w-xs bg-paper-2" />
      <div className="h-24 w-full bg-paper-2" />
    </div>
  );
}

export default function AtlasSpeciesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-6 py-10 md:px-8">
      <AnimatedSuspense fallback={<LocaleChromeBarFallback showTrailing={false} />}>
        <AtlasSpeciesChrome />
      </AnimatedSuspense>
      <AnimatedSuspense fallback={<AtlasDetailSkeleton />}>
        <AtlasSpeciesBody params={params} />
      </AnimatedSuspense>
    </article>
  );
}
