import { getLocale, getTranslations } from "next-intl/server";
import { SeasonFilterControl } from "@/components/season/SeasonFilterControl";
import type { SeasonPickerPath } from "@/lib/season/url";
import { AtlasSpeciesCard } from "./AtlasSpeciesCard";
import { AtlasPlaybackProvider } from "@/components/atlas/AtlasPlaybackProvider";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { selectForAtlas, type AtlasListSource } from "@/lib/atlas/select";
import { commonNameForLocale } from "@/lib/locale/species";
import type { SeasonFilter } from "@/lib/season/types";
import type { AppLocale } from "@/i18n/routing";

/** Server-filtered Atlas list. Season picker and audio stay client islands. */
export async function AtlasListView({
  species,
  season,
  pickerPath = "/atlas",
}: {
  species: AtlasListSource[];
  season: SeasonFilter;
  pickerPath?: SeasonPickerPath;
}) {
  const [t, tSeason, localeRaw] = await Promise.all([
    getTranslations("Atlas"),
    getTranslations("Season"),
    getLocale(),
  ]);
  const locale = localeRaw as AppLocale;
  const rows = selectForAtlas(species, season);
  const cardLabels = {
    play: t("playAudio"),
    pause: t("pauseAudio"),
    loading: t("loadingAudio"),
    retry: t("retryAudio"),
    unavailable: t("audioUnavailable"),
    wikipedia: t("wikipedia"),
    ebird: t("ebird"),
    opensNewTab: t("opensNewTab"),
  };

  return (
    <div className="group flex flex-col gap-8">
      <p className="text-center text-sm text-ink-soft">
        {t("subtitle", { season: tSeason(season) })}
      </p>

      <div className="flex justify-center">
        <SeasonFilterControl season={season} pathname={pickerPath} />
      </div>

      {rows.length === 0 ? (
        <Empty className="border-0 py-16">
          <EmptyHeader>
            <EmptyTitle className="font-heading text-xl">
              {t("emptyTitle")}
            </EmptyTitle>
            <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <AtlasPlaybackProvider>
          <ul className="grid grid-cols-1 gap-4 group-has-[[data-filtering]]:opacity-60 group-has-[[data-filtering]]:transition-opacity sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {rows.map((row, index) => (
              <li key={row.slug}>
                <AtlasSpeciesCard
                  slug={row.slug}
                  comName={commonNameForLocale(row, locale)}
                  sciName={row.sciName}
                  imageUrl={row.imageUrl}
                  index={index}
                  season={season}
                  locale={locale}
                  audio={row.audio}
                  ebird={row.ebird}
                  wikipedia={row.wikipedia}
                  labels={cardLabels}
                />
              </li>
            ))}
          </ul>
        </AtlasPlaybackProvider>
      )}
    </div>
  );
}
