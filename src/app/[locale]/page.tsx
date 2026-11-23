import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { BookOpenIcon } from "lucide-react";
import { CollageView } from "./CollageView";
import { SeasonLink } from "@/components/season/SeasonLink";
import { SeasonFilterControl } from "@/components/season/SeasonFilterControl";
import { SeasonPickerSkeleton } from "@/components/season/SeasonPickerSkeleton";
import { buttonVariants } from "@/components/ui/button";
import { FastLink } from "@/components/ui/fast-link";
import { AnimatedSuspense } from "@/components/ui/animated-suspense";
import { loadMessages } from "@/i18n/load-messages";
import type { AppLocale } from "@/i18n/routing";
import { loadForCollage } from "@/lib/collage/load-for-collage";
import {
  requireSeasonParam,
  type SeasonSearch,
} from "@/lib/season/require-param";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: t("title"), description: t("description") };
}

async function homeChromeCopy(locale: AppLocale) {
  "use cache";
  cacheLife("max");
  const messages = await loadMessages(locale);
  return {
    title: messages.Home.title,
    atlas: messages.Nav.atlas,
    hint: messages.Collage.hint,
  };
}

async function HomeChrome() {
  const locale = (await getLocale()) as AppLocale;
  const copy = await homeChromeCopy(locale);

  return (
    <>
      <SeasonLink
        pathname="/atlas"
        prefetch={true}
        aria-label={copy.atlas}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "absolute top-4 left-4 z-30 rounded-lg border-0 bg-paper-2 text-ink-soft shadow-(--recess)",
          "hover:bg-paper-2 hover:text-ink md:top-5 md:left-7",
        )}
      >
        <BookOpenIcon data-icon="inline-start" />
        {copy.atlas}
      </SeasonLink>

      <header className="flex flex-col items-center gap-2 px-4 pt-16 pb-4 text-center md:pt-16">
        <h1 className="font-heading text-[clamp(22px,2.8vw,34px)] leading-none tracking-tight text-ink">
          <FastLink
            href="/about"
            className="transition-colors hover:text-ink-2"
          >
            {copy.title}
          </FastLink>
        </h1>
        <p className="max-w-80 text-xs leading-relaxed text-ink-soft sm:max-w-none">
          {copy.hint}
        </p>
      </header>
    </>
  );
}

function HomeChromeFallback() {
  return (
    <>
      <div
        className="absolute top-4 left-4 z-30 h-8 w-20 rounded-lg bg-paper-2 shadow-(--recess) md:top-5 md:left-7"
        aria-hidden
      />
      <header className="flex flex-col items-center gap-2 px-4 pt-16 pb-4 text-center md:pt-16">
        <div className="h-[clamp(22px,2.8vw,34px)] w-56" aria-hidden />
        <div className="h-9 w-70 sm:h-4" aria-hidden />
      </header>
    </>
  );
}

function CollageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4" aria-hidden>
      <div className="flex justify-center">
        <SeasonPickerSkeleton />
      </div>
      <div className="min-h-80 flex-1" />
    </div>
  );
}

async function CollageSection({
  searchParams,
}: {
  searchParams: Promise<SeasonSearch>;
}) {
  const params = await searchParams;
  const season = await requireSeasonParam(params, "/");
  const layouts = await loadForCollage();
  const tiles = layouts.seasons[season].tiles;
  const present = new Set(tiles.map((tile) => tile.slug));
  return (
    <div className="group flex flex-1 flex-col gap-4">
      <div className="flex justify-center">
        <SeasonFilterControl season={season} pathname="/" />
      </div>
      <div className="relative min-h-80 flex-1">
        <CollageView
          art={layouts.art.filter((item) => present.has(item.slug))}
          tiles={tiles}
          season={season}
        />
      </div>
    </div>
  );
}

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<SeasonSearch>;
}) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <AnimatedSuspense fallback={<HomeChromeFallback />}>
        <HomeChrome />
      </AnimatedSuspense>

      <div className="relative mx-auto flex min-h-[50vh] w-full max-w-325 flex-1 flex-col px-4 pb-3 md:px-8">
        <AnimatedSuspense fallback={<CollageSkeleton />}>
          <CollageSection searchParams={searchParams} />
        </AnimatedSuspense>
      </div>
    </div>
  );
}
