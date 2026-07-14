/**
 * E2E 1 — successful review.
 * Inbox → ARCT-DEMO → replay run → inspect evidence → accept / edit /
 * escalate → apply approved batch → verify v12 → v13 in the Decision Ledger
 * with only the approved patches applied.
 */
import { test, expect, type Page } from "@playwright/test";

const card = (page: Page, proposalId: string) => page.locator(`#${proposalId}`);

test("full successful review path records exactly the approved changes as v13", async ({ page }) => {
  // 1 — Change Inbox is the home surface.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Change Inbox" })).toBeVisible();
  await expect(page.getByText("Synthetic demo data")).toBeVisible();

  // 2 — the first item opens the ARCT-DEMO earnings review.
  await page.getByRole("button", { name: /Open review/ }).click();
  await expect(page).toHaveURL(/\/deltas\/proposal_arct_enterprise_001/);

  // 3 — replay the successful run deterministically.
  await page.getByRole("link", { name: "Run Observatory" }).click();
  await expect(page).toHaveURL(/\/runs\/run-arct-success/);
  await page.getByRole("button", { name: "Replay deterministic demo" }).last().click();
  await expect(page.getByText("15/15 events", { exact: false })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Run completed in fixture mode.").first()).toBeVisible();

  // 4 — back to the proposals.
  await page.getByRole("button", { name: /Review 4 thesis delta proposals/ }).click();
  await expect(page).toHaveURL(/\/deltas\//);

  // 5 — inspect exact evidence in the drawer.
  await card(page, "proposal_arct_enterprise_001").getByRole("button", { name: /Release ·/ }).first().click();
  const drawer = page.getByRole("dialog", { name: "Evidence" });
  await expect(drawer.getByText("Revenue was $526 million, up 31% year over year.")).toBeVisible();
  await expect(drawer.getByText("Observed by Delphi (UTC)")).toBeVisible();
  await page.keyboard.press("Escape");

  // 6 — accept the medium-materiality supported pillar.
  await card(page, "proposal_arct_enterprise_001").getByRole("button", { name: "Accept", exact: true }).click();
  await page.getByRole("button", { name: "Approve and record" }).click();
  await expect(card(page, "proposal_arct_enterprise_001").getByText("Accepted", { exact: true })).toBeVisible();

  // 7 — edit the forecast-review proposal; the human actor is attributed.
  await card(page, "proposal_arct_forecast_003").getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByPlaceholder("Why the team's judgment differs").fill("Confirmed against the team model bridge.");
  await page.getByRole("button", { name: "Approve edited version" }).click();
  await expect(card(page, "proposal_arct_forecast_003").getByText("Edited & approved")).toBeVisible();

  // 8 — the Analyst cannot accept the high-materiality PM-required delta and
  //     is prompted to escalate it instead.
  await card(page, "proposal_arct_midmarket_002").getByRole("button", { name: "Accept", exact: true }).click();
  await expect(page.getByText("Not authorized.", { exact: false })).toBeVisible();
  await expect(page.getByText(/High-materiality changes require PM approval/)).toBeVisible();
  await page.getByRole("button", { name: "Escalate to PM instead" }).click();
  await expect(card(page, "proposal_arct_midmarket_002").getByText("Escalated to PM")).toBeVisible();

  // 9 — accept the new open question.
  await card(page, "proposal_arct_question_004").getByRole("button", { name: "Accept", exact: true }).click();
  await page.getByRole("button", { name: "Approve and record" }).click();
  await expect(card(page, "proposal_arct_question_004").getByText("Accepted", { exact: true })).toBeVisible();

  // 10 — apply the approved batch: exactly one v12 → v13 transition.
  await expect(page.getByText("3 approved changes ready")).toBeVisible();
  await page.getByRole("button", { name: "Apply approved changes" }).click();
  await page.getByRole("button", { name: "Record state transition" }).click();
  await expect(page).toHaveURL(/\/ledger\/transition_arct_001/);
  await expect(page.getByRole("heading", { name: "v12 → v13" })).toBeVisible();

  const stateDiff = page.getByRole("heading", { name: "State diff" }).locator("..").locator("..");
  await expect(stateDiff.getByText("Enterprise demand remains durable", { exact: true })).toBeVisible();
  await expect(stateDiff.getByText("teamConviction", { exact: true })).toBeVisible();
  await expect(stateDiff.getByText("medium", { exact: true })).toBeVisible();
  await expect(stateDiff.getByText("high", { exact: true })).toBeVisible();
  await expect(stateDiff.getByText(/metadata-only transition/i)).toHaveCount(0);

  // 11 — the ledger records only the approved patches; the escalated pillar
  //      is excluded and no thesis mutation happened for it.
  await expect(page.getByText("Forecast · Q3 revenue", { exact: false }).or(page.getByText("review required").first())).toBeVisible();
  await expect(page.getByText("Excluded from this transition")).toBeVisible();
  await expect(page.getByText(/ESCALATE — Mid-market demand durability/)).toBeVisible();

  // The current approved thesis is now v13.
  await expect(page.getByRole("navigation", { name: "Primary" }).getByText("v13", { exact: true })).toBeVisible();

  // 12 — the investment case reflects v13: escalated pillar untouched, new
  //      question present, forecast flagged for review.
  await page.goto("/cases/arct-demo");
  await expect(page.getByText("Approved team state · v13")).toBeVisible();
  await expect(
    page.getByText("Is mid-market weakness caused by implementation capacity or lower underlying demand?"),
  ).toBeVisible();
  const midmarketPillar = page.getByRole("article").filter({ hasText: "Mid-market expansion remains resilient" });
  await expect(midmarketPillar.getByText("active")).toBeVisible();
});
