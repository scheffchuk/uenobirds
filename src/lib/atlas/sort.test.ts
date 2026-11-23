import { describe, expect, it } from "vitest";
import { peakPrevalenceOf, sortAtlasItems } from "./sort";

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

  it("computes seasonal peak Prevalence across all four seasons", () => {
    expect(
      peakPrevalenceOf({ winter: 12, spring: 78, summer: 5, autumn: 34 }),
    ).toBe(78);
  });

  it("sorts by current Season Prevalence descending by default", () => {
    expect(
      sortAtlasItems(items, "prevalence", "en").map((i) => i.slug),
    ).toEqual(["corvus-macrorhynchos", "ardea-cinerea", "anas-acuta"]);
  });

  it("sorts alphabetically in the active Locale", () => {
    expect(sortAtlasItems(items, "alpha", "en").map((i) => i.slug)).toEqual([
      "ardea-cinerea",
      "corvus-macrorhynchos",
      "anas-acuta",
    ]);
  });

  it("sorts by all-year peak Prevalence descending", () => {
    expect(sortAtlasItems(items, "peak", "en").map((i) => i.slug)).toEqual([
      "anas-acuta",
      "corvus-macrorhynchos",
      "ardea-cinerea",
    ]);
  });
});
