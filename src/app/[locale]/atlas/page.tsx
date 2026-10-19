import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { AtlasListView } from "./AtlasListView";
import { LocaleChromeBar, LocaleChromeBarFallback } from "@/components/site/LocaleChromeBar";
import { SeasonLink } from "@/components/season/SeasonLink";
import { AnimatedSuspense } from "@/components/ui/animated-suspense";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SeasonPickerSkeleton } from "@/components/season/SeasonPickerSkeleton";
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
      <div className="h-[clamp(22px,2.8vw,34px)]" aria-hidden />
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
      <div className="flex justify-center">
        <SeasonPickerSkeleton />
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}>
            <Card size="sm" className="h-full ring-0 shadow-(--raised)">
              <div>
                <div className="px-(--card-spacing) pt-(--card-spacing)">
                  <div className="aspect-square w-full rounded-xl bg-paper-2 shadow-(--recess)" />
                </div>
                <CardHeader className="gap-0.5">
                  <CardTitle className="text-sm leading-snug">
                    <div className="h-[1lh] w-2/3 rounded-md bg-paper-2" />
                  </CardTitle>
                </CardHeader>
              </div>
              <div className="-mt-2 px-(--card-spacing)">
                <CardDescription className="text-xs">
                  <div className="h-[1lh] w-1/2 rounded-md bg-paper-2" />
                </CardDescription>
              </div>
              <Separator className="mx-auto w-[90%] self-center bg-hairline opacity-50 data-horizontal:w-[90%]" />
              <div className="flex items-center justify-between px-3 py-2">
                <div className="size-7 rounded-lg bg-paper-2" />
                <div className="h-7 w-20 rounded-lg bg-paper-2" />
              </div>
            </Card>
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
