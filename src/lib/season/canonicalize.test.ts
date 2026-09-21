import { describe, expect, it } from "vitest";
import {
  isSeasonCanonicalPath,
  seasonCanonicalLocation,
  stripLocalePrefix,
} from "./canonicalize";

describe("stripLocalePrefix", () => {
  it("strips known Locale prefixes", () => {
    expect(stripLocalePrefix("/ja")).toBe("/");
    expect(stripLocalePrefix("/en/atlas")).toBe("/atlas");
    expect(stripLocalePrefix("/zh-tw/atlas/mallard")).toBe("/atlas/mallard");
    expect(stripLocalePrefix("/en/about")).toBe("/about");
  });
});

describe("isSeasonCanonicalPath", () => {
  it("matches collage home and Atlas list only", () => {
    expect(isSeasonCanonicalPath("/")).toBe(true);
    expect(isSeasonCanonicalPath("/ja")).toBe(true);
    expect(isSeasonCanonicalPath("/en/atlas")).toBe(true);
    expect(isSeasonCanonicalPath("/zh-tw/atlas/")).toBe(true);
    expect(isSeasonCanonicalPath("/en/atlas/mallard")).toBe(false);
    expect(isSeasonCanonicalPath("/ja/about")).toBe(false);
    expect(isSeasonCanonicalPath("/en/audio")).toBe(false);
    expect(isSeasonCanonicalPath("/admin")).toBe(false);
  });
});

describe("seasonCanonicalLocation", () => {
  const july = Date.UTC(2025, 6, 15, 3);

  it("returns null when ?season= is already valid", () => {
    expect(
      seasonCanonicalLocation(
        new URL("https://example.test/en?season=winter"),
        july,
      ),
    ).toBeNull();
    expect(
      seasonCanonicalLocation(
        new URL("https://example.test/ja/atlas?season=all"),
        july,
      ),
    ).toBeNull();
  });

  it("pins missing or invalid season to the current Tokyo Season", () => {
    const missing = seasonCanonicalLocation(
      new URL("https://example.test/en"),
      july,
    );
    expect(missing?.pathname).toBe("/en");
    expect(missing?.searchParams.get("season")).toBe("summer");

    const invalid = seasonCanonicalLocation(
      new URL("https://example.test/ja/atlas?season=fall"),
      july,
    );
    expect(invalid?.searchParams.get("season")).toBe("summer");
  });

  it("does not rewrite species detail or about", () => {
    expect(
      seasonCanonicalLocation(
        new URL("https://example.test/en/atlas/mallard"),
        july,
      ),
    ).toBeNull();
    expect(
      seasonCanonicalLocation(new URL("https://example.test/en/about"), july),
    ).toBeNull();
  });

  it("keeps other query params when writing season", () => {
    const next = seasonCanonicalLocation(
      new URL("https://example.test/en?utm=1"),
      july,
    );
    expect(next?.searchParams.get("utm")).toBe("1");
    expect(next?.searchParams.get("season")).toBe("summer");
  });
});
