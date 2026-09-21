import { expect, test } from "@playwright/test";

test("audio credits have a localized route and locale toggle", async ({
  page,
}) => {
  await page.goto("/en/audio");

  await expect(page).toHaveURL(/\/en\/audio$/);
  await expect(
    page.getByRole("heading", { name: "Audio credits", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "About" }),
  ).toHaveAttribute("href", "/en/about");

  const language = page.getByRole("button", { name: "Language" });
  await expect(language).toBeVisible();
  // LocaleSwitcher cancels opens in the first 400ms after mount.
  await expect(async () => {
    await language.click();
    await expect(page.getByRole("menuitemradio", { name: "日本語" })).toBeVisible();
  }).toPass();
  await page.getByRole("menuitemradio", { name: "日本語" }).click();

  await expect(page).toHaveURL(/\/ja\/audio$/);
  await expect(
    page.getByRole("heading", { name: "音声クレジット", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "言語" })).toBeVisible();
});
