/**
 * E2E 3 — reset.
 * Create a v12 → v13 transition, reset the demo, and verify the deterministic
 * fixture-backed starting state is fully restored.
 */
import { test, expect, type Page } from "@playwright/test";

const card = (page: Page, proposalId: string) => page.locator(`#${proposalId}`);

test("reset restores thesis v12, clears transitions, and returns the initial state", async ({ page }) => {
  // 1 — create a transition.
  await page.goto("/deltas/proposal_arct_enterprise_001");
  await card(page, "proposal_arct_enterprise_001").getByRole("button", { name: "Accept", exact: true }).click();
  await page.getByRole("button", { name: "Approve and record" }).click();
  await page.getByRole("button", { name: "Apply approved changes" }).click();
  await page.getByRole("button", { name: "Record state transition" }).click();
  await expect(page.getByRole("heading", { name: "v12 → v13" })).toBeVisible();

  // State persists across reload before the reset.
  await page.reload();
  await expect(page.getByRole("heading", { name: "v12 → v13" })).toBeVisible();

  // 2 — reset the demo from the top bar.
  await page.getByRole("button", { name: "Reset demo" }).first().click();
  await page.getByRole("button", { name: "Reset to fixture state" }).click();

  // 3 — the fixture-backed starting state is restored.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("navigation", { name: "Primary" }).getByText("v12", { exact: true })).toBeVisible();

  await page.goto("/ledger");
  await expect(page.getByText("No state transitions recorded yet.")).toBeVisible();
  await expect(page.getByText("Current approved thesis: v12")).toBeVisible();

  // Reviews cleared — the proposal is reviewable again.
  await page.goto("/deltas/proposal_arct_enterprise_001");
  await expect(
    card(page, "proposal_arct_enterprise_001").getByText("Needs review", { exact: true }),
  ).toBeVisible();

  // Run replays cleared.
  await page.goto("/runs/run-arct-success");
  await expect(page.getByText("This run has not been replayed in your session yet.")).toBeVisible();
});
