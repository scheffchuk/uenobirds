import { getTranslations } from "next-intl/server";
import type { SpeciesRecord } from "@/lib/guide/types";
import { longFormForLocale, nameStackForLocale } from "@/lib/locale/species";
import { SeasonLink } from "@/components/season/SeasonLink";
import { SpeciesIllustrations } from "./SpeciesIllustrations";
import { SpeciesReferenceLinks } from "./SpeciesReferenceLinks";
import { SpeciesVoicePlayer } from "./SpeciesVoicePlayer";
import { PrevalenceChart } from "./PrevalenceChart";
import type { AppLocale } from "@/i18n/routing";
import { wikipediaUrlForLocale } from "@/lib/audio/links";
import { cn } from "@/lib/utils";

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function AtlasDetailView({
  species,
  locale,
  inModal = false,
}: {
  species: SpeciesRecord;
  locale: AppLocale;
  inModal?: boolean;
}) {
  const [t, tAtlas, tNav] = await Promise.all([
    getTranslations("AtlasDetail"),
    getTranslations("Atlas"),
    getTranslations("Nav"),
  ]);
  const stack = nameStackForLocale(species, locale);
  const description = longFormForLocale(species, "description", locale);
  const spottingTips = longFormForLocale(species, "spottingTips", locale);
  const hasArt = Boolean(species.perchUrl || species.flightUrl);
  const wikipediaUrl = wikipediaUrlForLocale(species.wikipedia, locale);
  const ebirdUrl = species.ebird?.url;
  const refLabels = {
    wikipedia: tAtlas("wikipedia"),
    ebird: tAtlas("ebird"),
    viewOnWikipedia: t("viewOnWikipedia"),
    viewOnEbird: t("viewOnEbird"),
    opensNewTab: tAtlas("opensNewTab"),
  };

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div
        className={cn(
          "postcard-sheet grid grid-cols-1 gap-2 p-2",
          hasArt
            ? "lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] lg:items-start"
            : "mx-auto w-full max-w-2xl",
          inModal && "postcard-sheet-modal",
        )}
      >
        {hasArt ? (
          <div
            className={cn(
              "flex min-w-0 lg:sticky lg:self-start",
              inModal
                ? "lg:top-2 lg:h-[min(calc(88dvh-16px),660px)]"
                : "lg:top-6 lg:h-[min(calc(100dvh-6rem),640px)]",
            )}
          >
            <SpeciesIllustrations
              key={species.slug}
              species={{
                slug: species.slug,
                perchUrl: species.perchUrl,
                flightUrl: species.flightUrl,
              }}
              name={stack.primary}
              footerEnd={
                <SpeciesReferenceLinks
                  wikipediaUrl={wikipediaUrl}
                  ebirdUrl={ebirdUrl}
                  labels={refLabels}
                  compact
                />
              }
              compact={inModal}
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-2">
          <header className="postcard-panel postcard-identity-panel flex flex-col gap-1.5 px-5 py-4 sm:px-6 sm:py-5">
            <h1 className="font-heading text-3xl leading-tight tracking-tight text-ink md:text-[34px]">
              {stack.primary}
            </h1>
            {stack.secondary.length > 0 ? (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-base text-ink-2">
                {stack.secondary.map((name) => (
                  <p key={name}>{name}</p>
                ))}
              </div>
            ) : null}
            <p className="pt-0.5 font-mono text-[11px] tracking-[0.06em] text-ink-soft italic">
              {stack.scientific}
            </p>
          </header>

          {hasText(spottingTips) ? (
            <section className="postcard-panel flex flex-col gap-3 px-5 py-4 sm:px-6 sm:py-5">
              <h2 className="editorial-section-heading">{t("spottingTips")}</h2>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink-2">
                {spottingTips}
              </p>
            </section>
          ) : null}

          {hasText(description) ? (
            <section className="postcard-panel flex flex-col gap-3 px-5 py-4 sm:px-6 sm:py-5">
              <h2 className="editorial-section-heading">{t("about")}</h2>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink-2">
                {description}
              </p>
            </section>
          ) : null}

          <SpeciesVoicePlayer slug={species.slug} audio={species.audio} />

          <section className="postcard-panel postcard-tail-panel flex flex-col gap-3 px-5 py-4 sm:px-6 sm:py-5">
            <h2 className="editorial-section-heading">{t("prevalence")}</h2>
            <PrevalenceChart prevalence={species.prevalence} />

            {!hasArt ? (
              <div className="flex justify-start pt-2">
                <SpeciesReferenceLinks
                  wikipediaUrl={wikipediaUrl}
                  ebirdUrl={ebirdUrl}
                  labels={refLabels}
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {!inModal ? (
        <div className="flex justify-start">
          <SeasonLink pathname="/" backLabel={tNav("backToCollage")} />
        </div>
      ) : null}
    </div>
  );
}
