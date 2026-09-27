import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const FIXTURE = path.join(process.cwd(), "tests/fixtures/live-run-cost.json");

test("an imported live run is re-verified, PM-governed, and applied as a new thesis version", async ({ page }) => {
  await page.goto("/live");
  await expect(page.getByRole("heading", { name: "Live Desk" })).toBeVisible();
  await expect(page.getByText("Live model analysis")).toBeVisible();

  await page.getByLabel("Import run file").setInputFiles(FIXTURE);
  await expect(page).toHaveURL(/\/live\/run_eval_cost_/);
  await expect(page.getByRole("heading", { name: /COSTCO WHOLESALE CORP/ })).toBeVisible();
  await expect(page.getByText("Real SEC filing").first()).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/\b(?:T|S\d+)-E\d{3}\b/);

  const first = page.locator("article").first();
  await expect(first.getByText("Requires PM")).toBeVisible();

  // Analyst cannot approve a PM-required change.
  await first.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(page.getByText("Not permitted")).toBeVisible();
  await expect(page.getByRole("button", { name: /Apply → v2/ })).toBeDisabled();

  // PM can; applying records v1 → v2 with the outcome beside the forecast.
  await page.getByRole("combobox").filter({ hasText: "Analyst" }).selectOption("pm");
  await first.getByRole("button", { name: "Accept", exact: true }).click();
  await page.getByRole("button", { name: /Apply → v2/ }).click();
  const ledger = page.locator("aside");
  await expect(ledger.getByText("v1 → v2")).toBeVisible();
  await expect(ledger.getByText(/actualValue: — → 11\.2/)).toBeVisible();
  await expect(first.getByText("Applied")).toBeVisible();
});

test("a tampered run file is rejected on import", async ({ page }) => {
  const run = JSON.parse(readFileSync(FIXTURE, "utf8"));
  const pid = run.proposals[0].proposalId;
  run.proposals[0].whatChanged = "Net sales grew 19.4 percent.";
  run.citedQuotes[pid][0].quote = "Net sales for the quarter increased 19.4 percent";

  await page.goto("/live");
  await page.getByLabel("Import run file").setInputFiles({
    name: "tampered.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(run)),
  });
  await expect(page.getByText("Import rejected — the file failed re-verification.")).toBeVisible();
  await expect(page).toHaveURL(/\/live$/);
});

test("the guide is reachable from the Live Desk and explains blocked reasons", async ({ page }) => {
  await page.goto("/live");
  await page.getByRole("link", { name: /Read the 5-minute guide/ }).click();
  await expect(page).toHaveURL(/\/guide/);
  await expect(page.getByRole("heading", { name: "Quick start (5 minutes)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Why a proposal is blocked" })).toBeVisible();
  await expect(page.getByText("quote_not_found")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Guide" })).toHaveAttribute("aria-current", "page");
});
