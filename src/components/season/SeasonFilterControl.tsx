import { SeasonPicker } from "@/components/season/SeasonPicker";
import type { SeasonFilter } from "@/lib/season/types";
import type { SeasonPickerPath } from "@/lib/season/url";

/** Season pills bound to shareable `?season=` — navigates, does not client-filter. */
export function SeasonFilterControl({
  season,
  pathname,
  className,
}: {
  season: SeasonFilter;
  pathname: SeasonPickerPath;
  className?: string;
}) {
  return (
    <SeasonPicker value={season} pathname={pathname} className={className} />
  );
}
