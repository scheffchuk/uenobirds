import type { AppLocale } from "@/i18n/routing";

export type AtlasSortKey = "prevalence" | "alpha" | "peak";

export type SortableAtlasItem = {
  slug: string;
  displayName: string;
  prevalence: number;
  peakPrevalence: number;
};

/**
 * Deterministic sort for Atlas list items across EN, JA, and ZH-TW Locales.
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
