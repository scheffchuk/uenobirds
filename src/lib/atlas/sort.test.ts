import { describe, expect, it } from "vitest";
import { sortAtlasItems } from "./sort";

describe("Atlas sorting", () => {
  const items = [
    {
      slug: "anas-acuta",
      displayName: "Northern Pintail",
      prevalence: 40,
      peakPrevalence: 95,
    },
    {
      slug: "corvus-macrorhynchos",
      displayName: "Large-billed Crow",
      prevalence: 85,
      peakPrevalence: 88,
    },
    {
      slug: "ardea-cinerea",
      displayName: "Grey Heron",
      prevalence: 60,
      peakPrevalence: 60,
    },
  ];

  it("sorts by current Season Prevalence descending by default", () => {
    expect(
      sortAtlasItems(items, "prevalence", "en").map((i) => i.slug),
    ).toEqual(["corvus-macrorhynchos", "ardea-cinerea", "anas-acuta"]);
  });

  it("sorts alphabetically in EN, JA, and ZH-TW Locales", () => {
    expect(sortAtlasItems(items, "alpha", "en").map((i) => i.slug)).toEqual([
      "ardea-cinerea",
      "corvus-macrorhynchos",
      "anas-acuta",
    ]);

    const jaItems = [
      { slug: "crow", displayName: "ハシブトガラス", prevalence: 80, peakPrevalence: 80 },
      { slug: "heron", displayName: "アオサギ", prevalence: 60, peakPrevalence: 60 },
      { slug: "pintail", displayName: "オナガガモ", prevalence: 40, peakPrevalence: 90 },
    ];
    expect(sortAtlasItems(jaItems, "alpha", "ja").map((i) => i.slug)).toEqual([
      "heron",
      "pintail",
      "crow",
    ]);

    const zhItems = [
      { slug: "crow", displayName: "巨嘴鴉", prevalence: 80, peakPrevalence: 80 },
      { slug: "heron", displayName: "蒼鷺", prevalence: 60, peakPrevalence: 60 },
      { slug: "sparrow", displayName: "麻雀", prevalence: 70, peakPrevalence: 70 },
    ];
    const zhSorted = sortAtlasItems(zhItems, "alpha", "zh-tw");
    expect(zhSorted).toHaveLength(3);
    expect(zhSorted).toEqual(sortAtlasItems(zhItems, "alpha", "zh-tw"));
  });

  it("sorts by all-year peak Prevalence descending", () => {
    expect(sortAtlasItems(items, "peak", "en").map((i) => i.slug)).toEqual([
      "anas-acuta",
      "corvus-macrorhynchos",
      "ardea-cinerea",
    ]);
  });
});
