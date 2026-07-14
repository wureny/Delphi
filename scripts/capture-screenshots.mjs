/**
 * Capture real product screenshots for the public website.
 * Drives the actual prototype (accept/edit/escalate/apply) so every image is
 * a genuine product state, then writes PNGs to public/screenshots/.
 *
 * Usage: node scripts/capture-screenshots.mjs [baseURL]
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3050";
const OUT = new URL("../public/screenshots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log(`captured ${name}.png`);
};

// 1 — Change Inbox (pristine).
await page.goto(`${BASE}/`);
await page.getByRole("heading", { name: "Change Inbox" }).waitFor();
await shot("change-inbox");

// 2 — Delta Review (pristine, focused on the weakening high-materiality delta).
await page.goto(`${BASE}/deltas/proposal_arct_midmarket_002`);
await page.locator("#proposal_arct_midmarket_002").waitFor();
await shot("delta-review");

// 3 — Evidence drawer.
await page
  .locator("#proposal_arct_midmarket_002")
  .getByRole("button", { name: /Call ·/ })
  .first()
  .click();
await page.getByRole("dialog", { name: "Evidence" }).waitFor();
await shot("evidence-drawer");
await page.keyboard.press("Escape");

// 4 — Run Observatory after a deterministic replay.
await page.goto(`${BASE}/runs/run-arct-success`);
await page.getByRole("button", { name: "Replay deterministic demo" }).last().click();
await page.getByText("15/15 events").waitFor({ timeout: 20_000 });
await shot("run-observatory");

// 5 — Perform the demo review flow, then capture the ledger transition.
await page.goto(`${BASE}/deltas/proposal_arct_enterprise_001`);
const card = (id) => page.locator(`#${id}`);

await card("proposal_arct_enterprise_001").getByRole("button", { name: "Accept", exact: true }).click();
await page.getByRole("button", { name: "Approve and record" }).click();

await card("proposal_arct_forecast_003").getByRole("button", { name: "Edit", exact: true }).click();
await page.getByPlaceholder("Why the team's judgment differs").fill("Confirmed against the team model bridge.");
await page.getByRole("button", { name: "Approve edited version" }).click();

await card("proposal_arct_midmarket_002").getByRole("button", { name: "Escalate", exact: true }).click();
await page.getByRole("dialog").getByRole("button", { name: "Escalate", exact: true }).click();

await card("proposal_arct_question_004").getByRole("button", { name: "Accept", exact: true }).click();
await page.getByRole("button", { name: "Approve and record" }).click();

await page.getByRole("button", { name: "Apply approved changes" }).click();
await page.getByRole("button", { name: "Record state transition" }).click();
await page.getByRole("heading", { name: "v12 → v13" }).waitFor();
await page.waitForTimeout(5600); // let the confirmation toast clear
await shot("decision-ledger");

// 6 — Privacy Receipt (now shows 4 proposed / 3 approved — real state).
await page.goto(`${BASE}/trust/run-arct-success`);
await page.getByText("Canonical writes").waitFor();
await shot("privacy-receipt");

await browser.close();
console.log("done");
