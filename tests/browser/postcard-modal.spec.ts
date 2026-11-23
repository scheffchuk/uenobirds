import { expect, test } from "@playwright/test";

test("opens species postcard modal from Atlas list, closes cleanly, and renders standalone on reload", async ({
  page,
}) => {
  await page.goto("/en/test-fixture?season=all");
  await expect(page.getByText("Winter Demo Bird")).toBeVisible();

  // Soft-navigating from the Atlas list opens the intercepting-route postcard modal
  await page.getByRole("link", { name: /Winter Demo Bird/ }).click();
  await expect(page).toHaveURL(/\/en\/atlas\/winter-demo-bird\?season=all$/);

  const dialog = page.getByRole("dialog", { name: "Species postcard" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Winter Demo Bird", level: 1 }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "About", level: 2 }),
  ).toBeVisible();
  await expect(
    dialog.getByText("A hardy winter demo visitor at Shinobazu Pond."),
  ).toBeVisible();
  await expect(
    dialog.getByText("Look near the northern reeds on crisp winter mornings."),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Spotting tips" }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("slider", { name: "Seek bird voice recording" }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Play audio" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Close species postcard" }),
  ).toHaveCount(0);

  // Pressing Escape closes the modal and returns to the Atlas list with ?season=all intact
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/en\/test-fixture\?season=all$/);
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Winter Demo Bird/ }),
  ).toBeVisible();

  // Hard navigation / direct reload renders the full standalone species page without modal chrome
  await page.goto("/en/atlas/winter-demo-bird?season=winter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Winter Demo Bird", level: 1 }),
  ).toBeVisible();
  await expect(page.locator('[data-season="winter"]')).toHaveAttribute(
    "data-active-season",
    "true",
  );
});
