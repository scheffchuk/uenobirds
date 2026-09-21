import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

test("collage canonicalize lands on an explicit Season", async ({ page }) => {
  await page.goto("/en");
  await expect(page).toHaveURL(/\/en\?season=(winter|spring|summer|autumn)$/);
});

test("invalid season canonicalizes to Tokyo Season, never all-year", async ({
  page,
}) => {
  await page.goto("/en?season=fall");
  await expect(page).toHaveURL(/\/en\?season=(winter|spring|summer|autumn)$/);
  expect(new URL(page.url()).searchParams.get("season")).not.toBe("all");
  expect(new URL(page.url()).searchParams.get("season")).not.toBe("fall");
});

test("atlas list canonicalize pins missing season", async ({ page }) => {
  await page.goto("/en/atlas");
  await expect(page).toHaveURL(/\/en\/atlas\?season=(winter|spring|summer|autumn)$/);
});

test("about is not season-canonicalized", async ({ page }) => {
  await page.goto("/en/about");
  await expect(page).toHaveURL(/\/en\/about$/);
});

test("Season pills on the Atlas fixture are instant navigations", async ({
  page,
  baseURL,
}) => {
  await page.goto("/en/atlas/test-fixture?season=all");
  await expect(page.getByText("Winter Demo Bird")).toBeVisible();

  await instant(
    page,
    async () => {
      await page.getByRole("link", { name: "Summer" }).click();
      await page.waitForURL(/test-fixture\?season=summer/);
      await expect(page.getByText("Summer Demo Bird")).toBeVisible();
    },
    { baseURL },
  );
});
