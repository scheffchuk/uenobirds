import { getTranslations } from "next-intl/server";
import type { SpeciesRecord } from "@/lib/guide/types";
import { longFormForLocale, nameStackForLocale } from "@/lib/locale/species";
import {
  AtlasAudioControl,
  type AtlasAudioLabels,
} from "@/components/atlas/AtlasAudioControl";
import { SpeciesIllustrations } from "./SpeciesIllustrations";
import { SpeciesReferenceLinks } from "./SpeciesReferenceLinks";
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
  const [t, tAtlas] = await Promise.all([
    getTranslations("AtlasDetail"),
    getTranslations("Atlas"),
  ]);
  const stack = nameStackForLocale(species, locale);
  const description = longFormForLocale(species, "description", locale);
  const spottingTips = longFormForLocale(species, "spottingTips", locale);
  const hasCopy = hasText(description) || hasText(spottingTips);
  const hasArt = Boolean(species.perchUrl || species.flightUrl);
  const hasAudio =
    species.audio?.status === "available" && Boolean(species.audio.url);
  const wikipediaUrl = wikipediaUrlForLocale(species.wikipedia, locale);
  const ebirdUrl = species.ebird?.url;
  const refLabels = {
    wikipedia: tAtlas("wikipedia"),
    ebird: tAtlas("ebird"),
    viewOnWikipedia: t("viewOnWikipedia"),
    viewOnEbird: t("viewOnEbird"),
    opensNewTab: tAtlas("opensNewTab"),
  };
  const audioLabels: AtlasAudioLabels = {
    play: tAtlas("playAudio"),
    pause: tAtlas("pauseAudio"),
    loading: tAtlas("loadingAudio"),
    retry: tAtlas("retryAudio"),
    unavailable: tAtlas("audioUnavailable"),
  };

  return (
    <div className={cn("flex flex-1 flex-col", !inModal && "justify-center")}>
      <div
        className={cn(
          "postcard-sheet grid grid-cols-1 gap-1.5 p-1.5 sm:gap-2 sm:p-2",
          hasArt
            ? "md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] md:items-stretch"
            : "mx-auto w-full max-w-xl",
          !inModal && "mx-auto w-full max-w-[820px]",
          inModal && "postcard-sheet-modal",
        )}
      >
        {hasArt ? (
          <div className="flex min-w-0">
            <SpeciesIllustrations
              key={species.slug}
              species={{
                slug: species.slug,
                perchUrl: species.perchUrl,
                flightUrl: species.flightUrl,
              }}
              name={stack.primary}
              footerEnd={
                <div className="flex items-center justify-end gap-1.5">
                  <SpeciesReferenceLinks
                    wikipediaUrl={wikipediaUrl}
                    ebirdUrl={ebirdUrl}
                    labels={refLabels}
                    compact
                  />
                  {hasAudio ? (
                    <AtlasAudioControl
                      audioUrl={species.audio?.url}
                      available
                      labels={audioLabels}
                      showTooltip={false}
                      className="postcard-action-pill size-7 min-h-7 justify-center px-0 text-ink-2 hover:bg-background hover:text-ink [&_svg]:size-3.5"
                    />
                  ) : null}
                </div>
              }
              compact={inModal}
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2">
          <header className="postcard-panel postcard-identity-panel flex flex-col justify-between gap-2.5 px-5 py-4">
            <h1 className="font-heading text-[26px] leading-[1.15] font-normal tracking-tight text-ink sm:text-[30px]">
              {stack.primary}
            </h1>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[13px] leading-snug text-ink-2">
              {stack.secondary.map((name) => (
                <span key={name}>{name}</span>
              ))}
              <span className="font-mono text-[11px] tracking-[0.03em] text-ink-soft italic">
                {stack.scientific}
              </span>
            </div>
          </header>

          <section className="postcard-panel postcard-tail-panel flex flex-1 flex-col gap-3 px-5 py-4">
            {hasCopy ? (
              <>
                <h2 className="font-heading text-[19px] leading-snug font-normal tracking-tight text-ink sm:text-[21px]">
                  {t("about")}
                </h2>
                <div className="flex flex-col gap-2.5 text-[13.5px] leading-[1.6] text-ink-2 sm:text-[14px]">
                  {hasText(description) ? (
                    <p className="whitespace-pre-wrap">{description}</p>
                  ) : null}
                  {hasText(spottingTips) ? (
                    <p className="whitespace-pre-wrap">{spottingTips}</p>
                  ) : null}
                </div>
              </>
            ) : null}

            <div className={cn("mt-auto", hasCopy && "pt-3")}>
              <PrevalenceChart prevalence={species.prevalence} />

              {!hasArt && (wikipediaUrl || ebirdUrl || hasAudio) ? (
                <div className="flex items-center justify-start gap-1.5 pt-3">
                  <SpeciesReferenceLinks
                    wikipediaUrl={wikipediaUrl}
                    ebirdUrl={ebirdUrl}
                    labels={refLabels}
                  />
                  {hasAudio ? (
                    <AtlasAudioControl
                      audioUrl={species.audio?.url}
                      available
                      labels={audioLabels}
                      showTooltip={false}
                      className="postcard-action-pill size-7 min-h-7 justify-center px-0 text-ink-2 hover:bg-background hover:text-ink [&_svg]:size-3.5"
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
