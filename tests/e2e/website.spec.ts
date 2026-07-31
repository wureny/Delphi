import { expect, test } from "@playwright/test";

test("public website states the product boundary and reaches the interactive demo", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /AI can generate an answer/ })).toBeVisible();
  await expect(page.getByText("alixwu2004@gmail.com", { exact: true })).toBeVisible();
  const contact = page.locator('a[href^="mailto:alixwu2004@gmail.com"]').first();
  await expect(contact).toHaveAttribute("href", /mailto:alixwu2004@gmail\.com/);
  await expect(page.locator("body")).not.toContainText(".example");
  await expect(page.getByText("The prototype proves the contract. Production work remains.")).toBeVisible();

  await page.getByRole("link", { name: "Open demo" }).first().click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("heading", { name: "Change Inbox" })).toBeVisible();
});

test("legacy website route redirects to the company homepage", async ({ page }) => {
  await page.goto("/website");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: /AI can generate an answer/ })).toBeVisible();
});

test("public website and navigation remain usable on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /AI can generate an answer/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open demo" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Contact Delphi" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
