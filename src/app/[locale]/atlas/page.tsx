import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { AtlasListView } from "./AtlasListView";
import { LocaleChromeBar, LocaleChromeBarFallback } from "@/components/site/LocaleChromeBar";
import { SeasonLink } from "@/components/season/SeasonLink";
import { AnimatedSuspense } from "@/components/ui/animated-suspense";
import { loadMessages } from "@/i18n/load-messages";
import type { AppLocale } from "@/i18n/routing";
import { loadAtlasList } from "@/lib/guide/load-atlas-list";
import { requireSeasonParam, type SeasonSearch } from "@/lib/season/require-param";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SeasonSearch>;
}): Promise<Metadata> {
  const params = await searchParams;
  const season = await requireSeasonParam(params, "/atlas");
  const tMeta = await getTranslations("Meta");
  const t = await getTranslations("Atlas");
  const tSeason = await getTranslations("Season");
  return {
    title: `${t("title")} · ${tMeta("title")}`,
    description: t("subtitle", { season: tSeason(season) }),
  };
}

async function atlasChromeCopy(locale: AppLocale) {
  "use cache";
  cacheLife("max");
  const messages = await loadMessages(locale);
  return {
    title: messages.Atlas.title,
    backToCollage: messages.Nav.backToCollage,
  };
}

async function AtlasChrome() {
  const locale = (await getLocale()) as AppLocale;
  const copy = await atlasChromeCopy(locale);

  return (
    <header className="flex flex-col gap-5">
      <LocaleChromeBar
        leading={
          <SeasonLink pathname="/" backLabel={copy.backToCollage} prefetch={true} />
        }
        trailing={null}
      />
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-heading text-[clamp(22px,2.8vw,34px)] leading-none tracking-tight text-ink">
          {copy.title}
        </h1>
      </div>
    </header>
  );
}

function AtlasChromeFallback() {
  return (
    <header className="flex flex-col gap-5">
      <LocaleChromeBarFallback showTrailing={false} />
      <div className="h-9" aria-hidden />
    </header>
  );
}

async function AtlasListSection({
  searchParams,
}: {
  searchParams: Promise<SeasonSearch>;
}) {
  const params = await searchParams;
  const season = await requireSeasonParam(params, "/atlas");
  const species = await loadAtlasList();
  return <AtlasListView species={species} season={season} />;
}

function AtlasListSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden>
      <div className="mx-auto h-5 w-48" />
      <div className="mx-auto h-8 w-52 rounded-full bg-paper-2 shadow-(--recess)" />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="aspect-[3/4] rounded-xl bg-paper-2 shadow-(--raised)" />
        ))}
      </ul>
    </div>
  );
}

export default function AtlasPage({
  searchParams,
}: {
  searchParams: Promise<SeasonSearch>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-2 px-6 py-10 md:px-8">
      <AnimatedSuspense fallback={<AtlasChromeFallback />}>
        <AtlasChrome />
      </AnimatedSuspense>

      <AnimatedSuspense fallback={<AtlasListSkeleton />}>
        <AtlasListSection searchParams={searchParams} />
      </AnimatedSuspense>
    </div>
  );
}
