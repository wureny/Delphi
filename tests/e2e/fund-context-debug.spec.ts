import { expect, test } from "@playwright/test";

test("fund context boundary exposes truthful synthetic ingestion controls and lineage", async ({ page }) => {
  await page.goto("/debug/context");

  await expect(page.getByRole("heading", { name: "Fund Context Boundary" })).toBeVisible();
  await expect(page.getByText("Synthetic connector simulation", { exact: true })).toBeVisible();
  await expect(page.getByText("Read-only", { exact: true })).toBeVisible();
  await expect(page.getByText(/No live customer system is connected/)).toBeVisible();
  await expect(page.getByText(/does not claim live Drive, SharePoint, upload, RAG/)).toBeVisible();
  await expect(page.getByText("5", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("4", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("0", { exact: true }).first()).toBeVisible();

  await page.getByLabel("Filter context role").selectOption("internal_working_context");
  await expect(page.getByRole("button", { name: /ARCT Team Forecast Snapshot v12/ })).toBeVisible();
  const memo = page.getByRole("button", { name: /ARCT Internal Research Memo/ });
  await expect(memo).toBeVisible();
  await expect(page.getByRole("button", { name: /Shareholder Letter/ })).toHaveCount(0);
  await memo.click();

  await expect(page.getByText("policy_internal_research", { exact: true })).toBeVisible();
  await expect(page.getByText("blocked", { exact: true })).toBeVisible();
  await expect(page.getByText("fixture_only", { exact: true })).toBeVisible();
  await expect(page.getByText("sha256:synthetic-internal-memo-v7", { exact: true })).toBeVisible();
  await expect(page.getByText("pillar_enterprise_demand", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: /Open graph projection/ }).click();
  await expect(page).toHaveURL(/\/debug\/graph$/);
  await page.getByPlaceholder("Search ID, label, or kind").fill("source_internal_memo_v7");
  await page
    .getByRole("button", {
      name: "ARCT Internal Research Memo — Pre-Earnings v7 source_internal_memo_v7 Source",
      exact: true,
    })
    .click();
  await expect(page.getByText("PROVIDES_CONTEXT", { exact: true })).toBeVisible();
  await expect(page.getByText("CONTEXTUALIZES", { exact: true }).first()).toBeVisible();
});

test("fund context boundary remains operable without horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/debug/context");

  await expect(page.getByRole("heading", { name: "Fund Context Boundary" })).toBeVisible();
  await expect(page.getByLabel("Search context artifacts")).toBeVisible();
  await page.getByLabel("Search context artifacts").fill("source_internal_memo_v7");
  await expect(page.getByRole("button", { name: /ARCT Internal Research Memo/ })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true);
});
