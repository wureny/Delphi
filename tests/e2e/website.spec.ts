import { test, expect } from "@playwright/test";

test("public website exposes a real contact and reaches the interactive product", async ({ page }) => {
  await page.goto("/website");

  await expect(page.getByText("alixwu2004@gmail.com", { exact: true })).toBeVisible();
  const contact = page.getByRole("link", { name: "Request a design-partner conversation" }).first();
  await expect(contact).toHaveAttribute("href", /mailto:alixwu2004@gmail\.com/);
  await expect(page.locator("body")).not.toContainText(".example");
  await expect(page.getByText(/deterministic browser-based demonstration.*frozen official public snapshots/)).toBeVisible();

  await page.getByRole("link", { name: "Open the interactive demo" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Change Inbox" })).toBeVisible();
});

test("public website and primary actions remain usable on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/website");

  await expect(page.getByRole("heading", { name: /From market events to governed investment decisions/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Request a design-partner conversation" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "See the workflow" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
