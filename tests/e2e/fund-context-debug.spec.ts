import { expect, test } from "@playwright/test";

function makeTextPdf(text: string): Buffer {
  const escaped = text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const stream = `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body);
}

test("Context Library exposes provenance and attaches curated context through the four-step flow", async ({ page }) => {
  await page.goto("/debug/context");
  await expect(page).toHaveURL(/\/context$/);
  await expect(page.getByRole("heading", { name: "Context Library" })).toBeVisible();
  await expect(page.getByText("Mixed provenance, explicit")).toBeVisible();
  await expect(page.getByText("7", { exact: true }).first()).toBeVisible();

  await page.getByLabel("Filter catalog by provenance").selectOption("real_public");
  await page.getByLabel("Filter catalog by context role").selectOption("institution_policy");
  await expect(page.getByText("CalPERS Total Fund Investment Policy").last()).toBeVisible();
  await page.getByText("CalPERS Total Fund Investment Policy").last().click();
  const inspector = page.getByRole("dialog", { name: "Context provenance" });
  await expect(inspector.getByText("Real public").first()).toBeVisible();
  await expect(inspector.getByText(/does not.*endorsement/i)).toBeVisible();
  await expect(inspector.getByRole("link", { name: "Open official source" })).toHaveAttribute("href", /^https:\/\/www\.calpers\.ca\.gov/);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Add context" }).click();
  await page.getByRole("button", { name: /Public\/demo catalog/ }).click();
  await page.getByRole("button", { name: /Microsoft 2025 Annual Report/ }).click();
  await expect(page.getByLabel("Binding scope")).toHaveValue("post_event");
  await page.getByRole("button", { name: "Attach context" }).click();
  await expect(page.getByText("Context attached with provenance")).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("Microsoft 2025 Annual Report and Form 10-K").first()).toBeVisible();
});

test("local CSV and text PDF imports remain browser-local and excluded from the frozen run", async ({ page }) => {
  await page.goto("/context");

  await page.getByRole("button", { name: "Add context" }).click();
  await page.getByRole("button", { name: /Local file/ }).click();
  await page.locator("#context-file").setInputFiles({
    name: "watchlist.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("ticker,weight\nMSFT,3.2\n"),
  });
  await expect(page.getByText("watchlist", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Binding scope")).toHaveValue("post_event");
  await page.getByRole("button", { name: "Attach context" }).click();
  await page.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "Add context" }).click();
  await page.getByRole("button", { name: /Local file/ }).click();
  await page.locator("#context-file").setInputFiles({
    name: "analyst-note.pdf",
    mimeType: "application/pdf",
    buffer: makeTextPdf("Local MSFT capacity note"),
  });
  await expect(page.getByText("analyst-note", { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Attach context" }).click();
  await page.getByRole("button", { name: "Done" }).click();

  await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
  await page.getByText("analyst-note", { exact: true }).first().click();
  const inspector = page.getByRole("dialog", { name: "Context provenance" });
  await expect(inspector.getByText(/raw file is not persisted or sent to a model/i)).toBeVisible();
  await expect(inspector.getByText(/Local MSFT capacity note/)).toBeVisible();
  await expect(inspector.getByText(/Excluded from deterministic analysis/)).toBeVisible();
});

test("context and search flows are keyboard operable and mobile-safe", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Change Inbox" })).toBeVisible();
  const search = page.getByRole("combobox", { name: "Search cases, deltas, and pages" });
  await search.fill("Context Library");
  await expect(page.getByRole("option", { name: /Context Library/ })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/context$/);

  await page.getByRole("button", { name: "Add context" }).click();
  await expect(page.getByRole("dialog", { name: /Add context/ })).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect.poll(() => page.evaluate(() => document.activeElement?.textContent?.trim())).toMatch(/Local file/);
  await page.keyboard.press("Tab");
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("Close dialog");
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Context Library" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    return Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          label: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 80) ?? "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter(({ left, right, width }) => width > 0 && (left < -1 || right > viewportWidth + 1))
      .slice(0, 12);
  })).toEqual([]);
});
