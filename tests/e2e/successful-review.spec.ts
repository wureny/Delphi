import { test, expect, type Page } from "@playwright/test";

const card = (page: Page, proposalId: string) => page.locator(`#${proposalId}`);

async function expand(page: Page, proposalId: string, headline: RegExp) {
  const proposal = card(page, proposalId);
  const collapsed = proposal.getByRole("button", { name: headline });
  if (await collapsed.isVisible()) await collapsed.click();
  return proposal;
}

test("MSFT public-source review records exactly the approved demo-thesis changes as v13", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Change Inbox" })).toBeVisible();
  await expect(page.getByText("Real sources + demo thesis")).toBeVisible();
  await expect(page.getByText(/Microsoft.*FY2025 Q4 Earnings/)).toBeVisible();

  await page.getByRole("button", { name: /Open review/ }).first().click();
  await expect(page).toHaveURL(/\/deltas\/proposal_msft_azure_001/);
  await expect(page.getByText("Real event · demo thesis")).toBeVisible();
  await expect(page.getByText(/0 of 4 decisions recorded/)).toBeVisible();

  await page.getByRole("link", { name: "Run Observatory" }).click();
  await expect(page).toHaveURL(/\/runs\/run-msft-fy25q4/);
  await page.getByRole("button", { name: "Replay deterministic demo" }).last().click();
  await expect(page.getByText("15/15 events", { exact: false })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("No live model was called.", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Declared inputs/ })).toBeVisible();

  await page.getByRole("button", { name: /Review 4 thesis delta proposals/ }).click();
  const azure = card(page, "proposal_msft_azure_001");
  await azure.getByRole("button", { name: /Release ·/ }).first().click();
  const drawer = page.getByRole("dialog", { name: "Evidence" });
  await expect(drawer.getByText("Azure and other cloud services revenue grew 39% year over year.")).toBeVisible();
  await expect(drawer.getByText("Microsoft Investor Relations")).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Open canonical source" })).toHaveAttribute("href", /^https:\/\/www\.microsoft\.com/);
  await page.keyboard.press("Escape");

  await azure.getByRole("button", { name: "Accept", exact: true }).click();
  await page.getByRole("button", { name: "Approve and record" }).click();
  await expect(azure.getByText("Accepted", { exact: true })).toBeVisible();

  const margin = await expand(page, "proposal_msft_margin_003", /Cloud margin forecast requires review/);
  await margin.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByPlaceholder("Why the team's judgment differs").fill("Review margin together with the capital-intensity bridge.");
  await page.getByRole("button", { name: "Approve edited version" }).click();
  await expect(margin.getByText("Edited & approved")).toBeVisible();

  const capacity = await expand(page, "proposal_msft_capacity_002", /Capacity constraint duration increased/);
  await capacity.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(page.getByText("Not authorized.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Escalate to PM instead" }).click();
  await expect(capacity.getByText("Escalated to PM")).toBeVisible();

  const outlook = await expand(page, "proposal_msft_outlook_004", /Test growth against rising AI capital intensity/);
  await outlook.getByRole("button", { name: "Accept", exact: true }).click();
  await page.getByRole("button", { name: "Approve and record" }).click();

  await expect(page.getByText(/4 of 4 decisions recorded/)).toBeVisible();
  await expect(page.getByText("3 approved changes ready")).toBeVisible();
  await page.getByRole("button", { name: "Apply approved changes" }).click();
  await page.getByRole("button", { name: "Record state transition" }).click();

  await expect(page).toHaveURL(/\/ledger\/transition_msft_001/);
  await expect(page.getByRole("heading", { name: "v12 → v13" })).toBeVisible();
  await expect(page.getByText("sha256:0fbbae6f9953b6016874270eb3a3cadf304309f333e707a417ca2999dbcb206e")).toBeVisible();
  await expect(page.getByText("real public · demo derived")).toBeVisible();
  await expect(page.getByText("Excluded from this transition")).toBeVisible();
  await expect(page.getByText(/ESCALATE — Capacity constraint duration increased/)).toBeVisible();

  await page.goto("/cases/msft-fy25q4");
  await expect(page.getByText("Approved team state · v13")).toBeVisible();
  await expect(page.getByText("Is accelerating Azure growth producing adequate returns relative to the rising level and mix of AI capital expenditure?")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Context coverage" })).toBeVisible();
});
