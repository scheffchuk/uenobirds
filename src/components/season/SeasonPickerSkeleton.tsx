import { getTranslations } from "next-intl/server";
import { SEASON_FILTERS } from "@/lib/season/url";
import { cn } from "@/lib/utils";
import {
  SeasonPickerLabel,
  seasonPickerItem,
  seasonPickerTrack,
} from "./season-picker-layout";

/** Translated labels reserve the same width at each breakpoint as the picker. */
export async function SeasonPickerSkeleton({ className }: { className?: string }) {
  const t = await getTranslations("Season");
  return (
    <div className={cn(seasonPickerTrack, className)} aria-hidden>
      {SEASON_FILTERS.map((season) => (
        <span key={season} className={cn(seasonPickerItem, "invisible")}>
          <SeasonPickerLabel full={t(season)} short={t(`short.${season}`)} />
        </span>
      ))}
    </div>
  );
}
