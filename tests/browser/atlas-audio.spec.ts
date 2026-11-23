import { expect, test, type Page } from "@playwright/test";

type AudioTestState = {
  playCalls: number;
  pauseCalls: number;
  loadCalls: number;
  failNextPlay: boolean;
};

type AtlasAudioWindow = Window & { __atlasAudioTest: AudioTestState };

function getAudioTestState(page: Page) {
  return page.evaluate(
    () => (window as unknown as AtlasAudioWindow).__atlasAudioTest,
  );
}

function card(page: Page, name: string) {
  return page.locator("li").filter({ hasText: name });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state: AudioTestState = {
      playCalls: 0,
      pauseCalls: 0,
      loadCalls: 0,
      failNextPlay: false,
    };
    Object.defineProperty(window, "__atlasAudioTest", {
      configurable: true,
      value: state,
    });

    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: function playStub(this: HTMLMediaElement) {
        state.playCalls += 1;
        if (state.failNextPlay) {
          state.failNextPlay = false;
          this.dispatchEvent(new Event("error"));
          return Promise.reject(new Error("stubbed playback failure"));
        }
        this.dispatchEvent(new Event("playing"));
        return Promise.resolve();
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value: function pauseStub(this: HTMLMediaElement) {
        state.pauseCalls += 1;
        this.dispatchEvent(new Event("pause"));
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "load", {
      configurable: true,
      value: function loadStub() {
        state.loadCalls += 1;
      },
    });
  });

  await page
    .context()
    .route("https://audio.test/**", (route) => route.abort("blockedbyclient"));
  await page
    .context()
    .route("https://*.convex.cloud/**", (route) =>
      route.abort("blockedbyclient"),
    );
  for (const service of [
    "https://*.convex.site/**",
    "https://xeno-canto.org/**",
    "https://api.ebird.org/**",
    "https://query.wikidata.org/**",
  ]) {
    await page
      .context()
      .route(service, (route) => route.abort("blockedbyclient"));
  }
  await page.goto("/en/test-fixture?season=all", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Atlas browser fixture" }),
  ).toBeVisible();
});

test("plays, pauses, resumes, completes, and keeps playback exclusive", async ({
  page,
}) => {
  const winter = card(page, "Winter Demo Bird");
  const summer = card(page, "Summer Demo Bird");
  const winterButton = winter.locator("button").first();
  const summerButton = summer.locator("button").first();

  await expect(page.locator("audio")).toHaveCount(3);
  await expect(winter.locator("audio")).toHaveAttribute("preload", "none");
  await expect(winter.locator("audio")).not.toHaveAttribute("src");
  expect(await getAudioTestState(page)).toMatchObject({ playCalls: 0 });

  await winterButton.click();
  await expect(winterButton).toHaveAccessibleName("Pause audio");

  await winterButton.click();
  await expect(winterButton).toHaveAccessibleName("Play audio");

  await winterButton.click();
  await expect(winterButton).toHaveAccessibleName("Pause audio");

  await summerButton.click();
  await expect(winterButton).toHaveAccessibleName("Play audio");
  await expect(winter.locator("audio")).not.toHaveAttribute("src");
  await expect(summerButton).toHaveAccessibleName("Pause audio");

  await summer.locator("audio").dispatchEvent("ended");
  await expect(summerButton).toHaveAccessibleName("Play audio");
  await expect(summer.locator("audio")).not.toHaveAttribute("src");

  expect(await getAudioTestState(page)).toMatchObject({ playCalls: 3 });
});

test("recovers from failure, exposes unavailable state, and supports keyboard use", async ({
  page,
}) => {
  const winter = card(page, "Winter Demo Bird");
  const unavailable = card(page, "Unavailable Demo Bird");
  const winterButton = winter.getByRole("button", { name: "Play audio" });

  await winterButton.focus();
  await expect(winterButton).toBeFocused();
  await page.evaluate(() => {
    (
      window as typeof window & { __atlasAudioTest: AudioTestState }
    ).__atlasAudioTest.failNextPlay = true;
  });
  await winterButton.press("Enter");
  await expect(
    winter.getByRole("button", { name: "Retry audio" }),
  ).toBeVisible();

  await winter.getByRole("button", { name: "Retry audio" }).click();
  await expect(
    winter.getByRole("button", { name: "Pause audio" }),
  ).toBeVisible();

  const unavailableButton = unavailable.getByRole("button", {
    name: "Audio unavailable",
  });
  await expect(unavailableButton).toBeDisabled();
  await expect(unavailable.locator("audio")).not.toHaveAttribute("src");
});

test("filters by Season and resets audio when a card leaves the list", async ({
  page,
}) => {
  const winter = card(page, "Winter Demo Bird");
  await winter.getByRole("button", { name: "Play audio" }).click();
  await expect(
    winter.getByRole("button", { name: "Pause audio" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Summer", exact: true }).click();
  await expect(page).toHaveURL(/season=summer/);
  await expect(card(page, "Winter Demo Bird")).toHaveCount(0);
  await expect(card(page, "Unavailable Demo Bird")).toHaveCount(0);
  await expect(card(page, "Summer Demo Bird")).toBeVisible();

  await page.getByRole("link", { name: "All year", exact: true }).click();
  await expect(page).toHaveURL(/season=all/);
  const restoredWinter = card(page, "Winter Demo Bird");
  await expect(
    restoredWinter.getByRole("button", { name: "Play audio" }),
  ).toBeVisible();
  await expect(restoredWinter.locator("audio")).not.toHaveAttribute("src");
});

test("searches across languages and scientific names, clears no results, and stops hidden audio", async ({
  page,
}) => {
  const search = page.getByRole("searchbox");
  const winter = card(page, "Winter Demo Bird");
  await winter.getByRole("button", { name: "Play audio" }).click();
  await expect(
    winter.getByRole("button", { name: "Pause audio" }),
  ).toBeVisible();

  await search.fill("夏季測試鳥");
  await expect(card(page, "Summer Demo Bird")).toBeVisible();
  await expect(winter).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("1 bird");

  await search.fill("DEMO avis AESTIVA");
  await expect(card(page, "Summer Demo Bird")).toBeVisible();
  await search.fill("冬のテスト鳥");
  await expect(
    winter.getByRole("button", { name: "Play audio" }),
  ).toBeVisible();
  await expect(winter.locator("audio")).not.toHaveAttribute("src");

  await search.fill("no-such-bird");
  await expect(page.getByText("No matching birds")).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(search).toHaveValue("");
  await expect(page.locator("audio")).toHaveCount(3);

  await search.fill("Winter");
  await page.getByRole("link", { name: "Summer", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(card(page, "Summer Demo Bird")).toBeVisible();
});
