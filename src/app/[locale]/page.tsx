import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { BookOpenIcon } from "lucide-react";
import { CollageView } from "./CollageView";
import { SeasonLink } from "@/components/season/SeasonLink";
import { buttonVariants } from "@/components/ui/button";
import { FastLink } from "@/components/ui/fast-link";
import { AnimatedSuspense } from "@/components/ui/animated-suspense";
import { loadMessages } from "@/i18n/load-messages";
import type { AppLocale } from "@/i18n/routing";
import { loadForCollage } from "@/lib/collage/load-for-collage";
import { requireSeasonParam, type SeasonSearch } from "@/lib/season/require-param";
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
          buttonVariants({ variant: "outline", size: "icon" }),
          "fixed top-4 right-14 z-40 size-8 rounded-lg border-0 bg-paper-2 text-ink-soft shadow-(--recess)",
          "hover:bg-paper-2 hover:text-ink md:top-5 md:right-16",
        )}
      >
        <BookOpenIcon />
      </SeasonLink>

      <header className="fixed inset-x-0 top-0 z-20 flex flex-col items-center px-4 pt-16 pb-4 text-center md:pt-20">
        <h1 className="font-heading text-[clamp(22px,2.8vw,34px)] leading-none tracking-tight text-ink">
          <FastLink href="/about" className="transition-colors hover:text-ink-2">
            {copy.title}
          </FastLink>
        </h1>
      </header>
      <div className="h-28 shrink-0 md:h-32" aria-hidden />
    </>
  );
}

function HomeChromeFallback() {
  return (
    <>
      <div
        className="fixed top-4 right-14 z-40 size-8 rounded-lg bg-paper-2 shadow-(--recess) md:top-5 md:right-16"
        aria-hidden
      />
      <header className="fixed inset-x-0 top-0 z-20 flex flex-col items-center px-4 pt-16 pb-4 text-center md:pt-20">
        <div className="h-9 w-56" aria-hidden />
      </header>
      <div className="h-28 shrink-0 md:h-32" aria-hidden />
    </>
  );
}

function CollageSkeleton() {
  return (
    <>
      <div
        className="fixed top-4 left-4 z-30 h-8 w-52 max-w-[calc(100vw-8rem)] rounded-full bg-paper-2 shadow-(--recess) md:top-5 md:left-7"
        aria-hidden
      />
      <div className="absolute inset-0" aria-hidden />
    </>
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
    <CollageView
      art={layouts.art.filter((item) => present.has(item.slug))}
      tiles={tiles}
      season={season}
    />
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

      <div className="relative mx-auto min-h-[60vh] w-full max-w-325 flex-1 px-2 md:px-8">
        <AnimatedSuspense fallback={<CollageSkeleton />}>
          <CollageSection searchParams={searchParams} />
        </AnimatedSuspense>
      </div>
    </div>
  );
}
