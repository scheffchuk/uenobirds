import type { SpeciesRecord } from "@/lib/guide/types";

/** Dev/Playwright-only fixture species for offline browser tests. */
export const BROWSER_FIXTURE_SPECIES: SpeciesRecord[] = [
  {
    slug: "winter-demo-bird",
    sciName: "Demo avis hiemalis",
    comNameEn: "Winter Demo Bird",
    comNameJa: "冬のテスト鳥",
    comNameZhTw: "冬季測試鳥",
    listed: true,
    illustrationStatus: "approved",
    prevalence: { winter: 100, spring: 40, summer: 0, autumn: 20 },
    descriptionEn: "A hardy winter demo visitor at Shinobazu Pond.",
    spottingTipsEn: "Look near the northern reeds on crisp winter mornings.",
    audio: {
      status: "available",
      url: "https://audio.test/winter-demo-bird.mp3",
      durationSeconds: 18,
      soundType: "call",
      recordist: "Fixture Recordist",
    },
    wikipedia: {
      en: "https://wikipedia.test/wiki/Winter_Demo_Bird",
      ja: "https://wikipedia.test/ja/Winter_Demo_Bird",
      zhTw: "https://wikipedia.test/zh-tw/Winter_Demo_Bird",
    },
    ebird: {
      speciesCode: "windem1",
      url: "https://ebird.test/species/windem1",
    },
  },
  {
    slug: "summer-demo-bird",
    sciName: "Demo avis aestiva",
    comNameEn: "Summer Demo Bird",
    comNameJa: "夏のテスト鳥",
    comNameZhTw: "夏季測試鳥",
    listed: true,
    illustrationStatus: "approved",
    prevalence: { winter: 0, spring: 30, summer: 90, autumn: 10 },
    descriptionEn: "A lively summer demo visitor across Ueno canopy paths.",
    spottingTipsEn: "Listen in the tall zelkova trees after sunrise.",
    audio: {
      status: "available",
      url: "https://audio.test/summer-demo-bird.mp3",
      durationSeconds: 14,
      soundType: "song",
      recordist: "Fixture Recordist",
    },
    wikipedia: {
      en: "https://wikipedia.test/wiki/Summer_Demo_Bird",
      ja: "https://wikipedia.test/ja/Summer_Demo_Bird",
      zhTw: "https://wikipedia.test/zh-tw/Summer_Demo_Bird",
    },
    ebird: {
      speciesCode: "sumdem1",
      url: "https://ebird.test/species/sumdem1",
    },
  },
  {
    slug: "unavailable-demo-bird",
    sciName: "Demo avis muta",
    comNameEn: "Unavailable Demo Bird",
    comNameJa: "音声なしテスト鳥",
    comNameZhTw: "無聲測試鳥",
    listed: true,
    illustrationStatus: "approved",
    prevalence: { winter: 35, spring: 0, summer: 0, autumn: 0 },
    descriptionEn: "A quiet fixture species with no audio recording.",
    audio: {
      status: "unavailable",
      unavailableReason: "Fixture has no recording",
    },
  },
];

export function findBrowserFixtureSpecies(slug: string): SpeciesRecord | null {
  if (process.env.BROWSER_TEST_FIXTURES !== "1") return null;
  return BROWSER_FIXTURE_SPECIES.find((sp) => sp.slug === slug) ?? null;
}
