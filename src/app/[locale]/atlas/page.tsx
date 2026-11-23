import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { AtlasListView } from "./AtlasListView";
import { SeasonLink } from "@/components/season/SeasonLink";
import { AnimatedSuspense } from "@/components/ui/animated-suspense";
import { SeasonPickerSkeleton } from "@/components/season/SeasonPickerSkeleton";
import { loadMessages } from "@/i18n/load-messages";
import type { AppLocale } from "@/i18n/routing";
import { loadAtlasList } from "@/lib/guide/load-atlas-list";
import {
  requireSeasonParam,
  type SeasonSearch,
} from "@/lib/season/require-param";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SeasonSearch>;
}): Promise<Metadata> {
  const params = await searchParams;
  const season = await requireSeasonParam(params, "/atlas");
  const tMeta = await getTranslations("Meta");
  const t = await getTranslations("Atlas");
  return {
    title: `${t("title")} · ${tMeta("title")}`,
    description: t(`subtitle.${season}`),
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
    <header className="grid grid-cols-[2rem_1fr_2rem] items-center gap-3">
      <SeasonLink pathname="/" backLabel={copy.backToCollage} prefetch={true} />
      <h1 className="text-center font-heading text-[clamp(22px,2.8vw,34px)] leading-none tracking-tight text-ink">
        {copy.title}
      </h1>
    </header>
  );
}

function AtlasChromeFallback() {
  return <div className="h-8" aria-hidden />;
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
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="mx-auto h-5 w-48" />
      <div className="flex justify-center">
        <SeasonPickerSkeleton />
      </div>
      <div className="h-10 max-w-sm rounded-lg bg-paper-2" />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li
            key={i}
            className="flex h-26 items-center gap-3 rounded-xl p-3 shadow-(--raised) sm:h-80 sm:flex-col"
          >
            <div className="size-20 shrink-0 rounded-lg bg-paper-2 sm:size-48" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-32 rounded-md bg-paper-2" />
              <div className="h-3 w-24 rounded-md bg-paper-2" />
            </div>
          </li>
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
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-2 px-4 pt-4 pb-10 sm:px-6 md:px-8 md:pt-5">
      <AnimatedSuspense fallback={<AtlasChromeFallback />}>
        <AtlasChrome />
      </AnimatedSuspense>

      <AnimatedSuspense fallback={<AtlasListSkeleton />}>
        <AtlasListSection searchParams={searchParams} />
      </AnimatedSuspense>
    </div>
  );
}
