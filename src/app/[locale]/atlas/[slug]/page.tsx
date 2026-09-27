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
    <div className="flex flex-1 flex-col gap-10" aria-hidden>
      <div className="flex flex-col gap-2">
        <div className="h-9 w-2/3 rounded-lg bg-paper-2 shadow-(--recess) md:h-10" />
        <div className="h-6 w-1/3 rounded-md bg-paper-2 shadow-(--recess)" />
        <div className="h-4 w-1/4 rounded-full bg-paper-2 shadow-(--recess)" />
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="aspect-square w-full max-w-xs rounded-2xl bg-paper-2 shadow-(--recess)" />
            <div className="h-3 w-16 rounded-full bg-paper-2 shadow-(--recess)" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className="h-6 w-28 rounded-md bg-paper-2 shadow-(--recess)" />
        <div className="flex flex-col gap-2.5">
          <div className="h-4 w-full rounded-full bg-paper-2 shadow-(--recess)" />
          <div className="h-4 w-full rounded-full bg-paper-2 shadow-(--recess)" />
          <div className="h-4 w-4/5 rounded-full bg-paper-2 shadow-(--recess)" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="h-6 w-36 rounded-md bg-paper-2 shadow-(--recess)" />
        <div className="grid grid-cols-4 items-end gap-3 border-t border-hairline pt-4">
          {[60, 85, 45, 70].map((height) => (
            <div key={height} className="flex flex-col items-center gap-2">
              <div className="flex h-36 w-full items-end justify-center">
                <div
                  className="w-full max-w-12 rounded-t-md bg-paper-2 shadow-(--recess)"
                  style={{ height: `${height}%` }}
                />
              </div>
              <div className="h-3 w-10 rounded-full bg-paper-2 shadow-(--recess)" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="h-8 w-40 rounded-full bg-paper-2 shadow-(--recess)" />
        <div className="h-8 w-32 rounded-full bg-paper-2 shadow-(--recess)" />
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
