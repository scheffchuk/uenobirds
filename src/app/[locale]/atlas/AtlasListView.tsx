import { getLocale, getTranslations } from "next-intl/server";
import { SeasonFilterControl } from "@/components/season/SeasonFilterControl";
import type { SeasonPickerPath } from "@/lib/season/url";
import { AtlasSpeciesCard } from "./AtlasSpeciesCard";
import { AtlasPlaybackProvider } from "@/components/atlas/AtlasPlaybackProvider";
import { AtlasSearch } from "./AtlasSearch";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { selectForAtlas, type AtlasListSource } from "@/lib/atlas/select";
import { peakPrevalenceOf } from "@/lib/atlas/sort";
import { commonNameForLocale } from "@/lib/locale/species";
import type { SeasonFilter } from "@/lib/season/types";
import type { AppLocale } from "@/i18n/routing";

/** Season filtering and cards render on the server; search and audio are client islands. */
export async function AtlasListView({
  species,
  season,
  pickerPath = "/atlas",
}: {
  species: AtlasListSource[];
  season: SeasonFilter;
  pickerPath?: SeasonPickerPath;
}) {
  const [t, localeRaw] = await Promise.all([
    getTranslations("Atlas"),
    getLocale(),
  ]);
  const locale = localeRaw as AppLocale;
  const rows = selectForAtlas(species, season);
  const peakBySlug = new Map(
    species.map((sp) => [sp.slug, peakPrevalenceOf(sp.prevalence)]),
  );
  const cardLabels = {
    play: t("playAudio"),
    pause: t("pauseAudio"),
    loading: t("loadingAudio"),
    retry: t("retryAudio"),
    unavailable: t("audioUnavailable"),
  };

  return (
    <div className="group flex flex-col gap-4">
      <p className="text-center text-sm text-ink-soft">
        {t(`subtitle.${season}`)}
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
          <AtlasSearch
            key={season}
            items={rows.map((row, index) => {
              const displayName = commonNameForLocale(row, locale);
              return {
                slug: row.slug,
                displayName,
                prevalence: row.prevalence,
                peakPrevalence: peakBySlug.get(row.slug) ?? row.prevalence,
                names: [
                  row.comNameEn,
                  row.comNameJa,
                  row.comNameZhTw,
                  row.sciName,
                ].join(" "),
                content: (
                  <AtlasSpeciesCard
                    slug={row.slug}
                    comName={displayName}
                    sciName={row.sciName}
                    imageUrl={row.imageUrl}
                    prevalence={row.prevalence}
                    index={index}
                    season={season}
                    audio={row.audio}
                    labels={cardLabels}
                  />
                ),
              };
            })}
          />
        </AtlasPlaybackProvider>
      )}
    </div>
  );
}
