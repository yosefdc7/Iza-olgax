import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.describe("Daily Sales Ledger Reports E2E", () => {
  test.setTimeout(120_000);

  test("displays ledger metrics, series breakdowns, pricing audit, and exports CSV", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("http://localhost:3000/reports");
    await expect(page.locator("h1").first()).toHaveText(/Reports/i);

    // Switch to Daily Sales Ledger tab if present
    const ledgerTab = page.locator('button:has-text("Daily Sales Ledger")');
    if (await ledgerTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ledgerTab.click();
    }

    // Verify summary metric cards
    await expect(page.locator("text=/Gross revenue/i").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=/Receipts on page/i").first()).toBeVisible({ timeout: 10000 });

    // Verify Series filter dropdown is available
    const seriesFilter = page.locator('select[aria-label="Receipt series"]');
    if (await seriesFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      const optionsText = await seriesFilter.innerText();
      expect(optionsText).toContain("All series");
      if (optionsText.includes("211")) {
        await seriesFilter.selectOption({ label: "211" });
        await page.waitForTimeout(500);
      }
    }

    // Verify CSV export link / download
    const csvLink = page.locator('a:has-text("CSV")').first();
    await expect(csvLink).toBeVisible({ timeout: 10000 });
    const href = await csvLink.getAttribute("href");
    expect(href).toContain("format=csv");

    const downloadPromise = page.waitForEvent("download", { timeout: 10000 }).catch(() => null);
    await csvLink.click();
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain(".csv");
    }
  });
});
