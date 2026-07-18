import { expect, test } from "@playwright/test";

test("rapid feedback is capped at three top-positioned toasts", async ({ page }) => {
  await page.goto("/deltas/proposal_msft_azure_001");
  const role = page.getByRole("combobox", { name: "Active reviewer role" });
  for (const value of ["pm", "analyst", "pm", "analyst", "pm"]) await role.selectOption(value);
  const toasts = page.locator('[aria-live="polite"] > button');
  await expect.poll(() => toasts.count()).toBeGreaterThan(0);
  expect(await toasts.count()).toBeLessThanOrEqual(3);
  const boxes = await toasts.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()));
  expect(Math.max(...boxes.map((box) => box.bottom))).toBeLessThan(420);
});

test("system typography produces no missing font assets and hero media is prioritized", async ({ page }) => {
  const font404s: string[] = [];
  page.on("response", (response) => {
    if (response.status() === 404 && /font|woff/i.test(response.url())) font404s.push(response.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Change Inbox" })).toBeVisible();
  await page.goto("/website");
  const screenshots = page.locator("figure img");
  await expect(screenshots.first()).toHaveAttribute("loading", "eager");
  await expect(screenshots.first()).toHaveAttribute("fetchpriority", "high");
  await expect(screenshots.nth(1)).toHaveAttribute("loading", "lazy");
  expect(font404s).toEqual([]);
});
