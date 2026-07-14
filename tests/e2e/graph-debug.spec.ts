import { test, expect } from "@playwright/test";

test("internal graph debug page exposes a current read-only product projection", async ({ page }) => {
  await page.goto("/debug/graph");

  await expect(page.getByRole("heading", { name: "Graph Projection Debug" })).toBeVisible();
  await expect(page.getByText("Projection only", { exact: true })).toBeVisible();
  await expect(page.getByText(/No Neo4j, Cypher, or database-owned state/)).toBeVisible();
  await expect(page.getByText(/analysis is fixture; graph is projection_only/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Node inventory" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Selected node" })).toBeVisible();

  await page.getByPlaceholder("Search ID, label, or kind").fill("proposal_arct_enterprise_001");
  const proposalNode = page.getByRole("button", { name: /Large-enterprise demand remains supportive/ });
  await expect(proposalNode).toBeVisible();
  await proposalNode.click();

  await expect(page.getByText("proposal_arct_enterprise_001").last()).toBeVisible();
  await expect(page.getByText("CITES", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("TARGETS", { exact: true }).first()).toBeVisible();
});
