/**
 * E2E 2 — degraded run.
 * Missing transcript → degraded replay → degraded banner → partial findings
 * retained → blocked proposal cannot be approved → escalate → no unauthorized
 * canonical transition.
 */
import { test, expect, type Page } from "@playwright/test";

const card = (page: Page, proposalId: string) => page.locator(`#${proposalId}`);

test("degraded run retains safe findings, blocks unsafe approval, and never mutates state", async ({ page }) => {
  // 1 — trigger the missing transcript from the inbox degraded row.
  await page.goto("/");
  await page.getByRole("button", { name: /Simulate & replay/ }).click();
  await expect(page).toHaveURL(/\/runs\/run-arct-degraded/);

  // 2 — replay the degraded run.
  await page.getByRole("button", { name: "Replay deterministic demo" }).last().click();
  await expect(page.getByText("6/6 events", { exact: false })).toBeVisible({ timeout: 15_000 });

  // 3 — degraded banner with the explicit reason; not just a toast.
  await expect(page.getByText("Analysis completed with gaps.", { exact: false })).toBeVisible();
  await expect(page.getByText("source_unavailable").first()).toBeVisible();

  // 4 — safe partial findings are retained as reviewable proposals.
  await page.getByRole("button", { name: /Review 2 thesis delta proposals/ }).click();
  await expect(card(page, "proposal_arct_revenue_degraded_001")).toBeVisible();
  await expect(card(page, "proposal_arct_forecast_degraded_003")).toBeVisible();

  // 5 — the transcript-dependent high-impact proposal is visibly blocked.
  const blocked = card(page, "proposal_arct_midmarket_002");
  await expect(blocked.getByText("Blocked — required evidence is unavailable", { exact: false })).toBeVisible();
  await blocked.getByRole("button", { name: /Mid-market demand durability is less certain/ }).click();

  // 6 — unsafe approval is impossible: Accept fails closed (disabled).
  await expect(blocked.getByRole("button", { name: "Accept", exact: true })).toBeDisabled();
  await expect(blocked.getByRole("button", { name: "Edit", exact: true })).toBeDisabled();

  // Evidence for the blocked proposal is marked unavailable, not reconstructed.
  await blocked.getByRole("button", { name: /unavailable/ }).first().click();
  const drawer = page.getByRole("dialog", { name: "Evidence" });
  await expect(drawer.getByText("Source unavailable")).toBeVisible();
  await expect(drawer.getByText(/fails closed/)).toBeVisible();
  await page.keyboard.press("Escape");

  // 7 — escalate the blocked proposal (allowed; never mutates).
  await blocked.getByRole("button", { name: "Escalate", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Escalate", exact: true }).click();
  await expect(blocked.getByText("Escalated to PM")).toBeVisible();

  // 8 — no canonical transition occurred.
  await page.goto("/ledger");
  await expect(page.getByText("No state transitions recorded yet.")).toBeVisible();
  await expect(page.getByText("MSFT approved v12")).toBeVisible();
});
