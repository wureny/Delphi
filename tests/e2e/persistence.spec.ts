import { expect, test } from "@playwright/test";

test("an incompatible persisted fixture envelope cannot override the current baseline", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "delphi-demo-state-v0.2.1",
      JSON.stringify({
        state: {
          domain: { currentThesis: { version: 99, summary: "stale persisted state" } },
          role: "pm",
        },
        version: 0,
      }),
    );
  });

  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Primary" }).getByText("v12", { exact: true })).toBeVisible();
  await expect(page.getByText("stale persisted state")).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Active reviewer role" })).toHaveValue("analyst");
});
