import type { AppLocale } from "@/i18n/routing";
import type { SeasonalPrevalence } from "@/lib/guide/types";

export type AtlasSortKey = "prevalence" | "alpha" | "peak";

export type SortableAtlasItem = {
  slug: string;
  displayName: string;
  prevalence: number;
  peakPrevalence: number;
};

export function peakPrevalenceOf(prevalence: SeasonalPrevalence): number {
  return Math.max(
    prevalence.winter,
    prevalence.spring,
    prevalence.summer,
    prevalence.autumn,
  );
}

/**
 * Deterministic sort for Atlas list items across all three Locales.
 */
export function sortAtlasItems<T extends SortableAtlasItem>(
  items: readonly T[],
  sortBy: AtlasSortKey,
  locale: AppLocale,
): T[] {
  const collatorLocale =
    locale === "ja" ? "ja-JP" : locale === "zh-tw" ? "zh-Hant-TW" : "en-US";
  const copy = [...items];

  copy.sort((a, b) => {
    if (sortBy === "alpha") {
      return (
        a.displayName.localeCompare(b.displayName, collatorLocale, {
          sensitivity: "base",
        }) || a.slug.localeCompare(b.slug)
      );
    }
    if (sortBy === "peak") {
      return (
        b.peakPrevalence - a.peakPrevalence ||
        b.prevalence - a.prevalence ||
        a.displayName.localeCompare(b.displayName, collatorLocale, {
          sensitivity: "base",
        })
      );
    }
    return (
      b.prevalence - a.prevalence ||
      b.peakPrevalence - a.peakPrevalence ||
      a.displayName.localeCompare(b.displayName, collatorLocale, {
        sensitivity: "base",
      })
    );
  });

  return copy;
}
