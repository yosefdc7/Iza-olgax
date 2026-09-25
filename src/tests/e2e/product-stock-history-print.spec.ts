import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

const PRODUCT_NAME = `E2E-Print-Test-${Date.now()}`;

test.describe("Product Stock Adjustment History Print", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("can print stock adjustment history report from product page", async ({ page }) => {
    // 1. Create product for testing
    await page.goto("http://localhost:3000/products/new");
    await page.fill('input[name="name"]', PRODUCT_NAME);
    await page.fill('input[name="price"]', "120.00");
    await page.fill('input[name="stock"]', "25");
    await page.fill('input[name="lowStockThreshold"]', "5");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/products(\?.*)?$/, { timeout: 30000 });

    // 2. Navigate to product detail page
    const productLink = page.locator(`a:has-text("${PRODUCT_NAME}")`).first();
    await expect(productLink).toBeVisible({ timeout: 15000 });
    const href = await productLink.getAttribute("href");
    if (href) {
      await page.goto(`http://localhost:3000${href}`);
    } else {
      await productLink.click();
    }
    await expect(page).toHaveURL(/\/products\/[a-zA-Z0-9]+/, { timeout: 30000 });

    // 3. Verify Product Details
    await expect(page.locator("h1", { hasText: PRODUCT_NAME }).first()).toBeVisible();

    // 4. Verify Print Stock History Button in top action bar
    const printBtn = page.locator('[data-testid="print-stock-history-button"]').first();
    await expect(printBtn).toBeVisible({ timeout: 5000 });
    await expect(printBtn).toContainText(/Print Stock History/i);

    // 5. Verify Compact Print Button in Inventory Adjustment Log header
    const compactPrintBtn = page.locator('[data-testid="print-stock-history-compact-button"]').first();
    await expect(compactPrintBtn).toBeVisible({ timeout: 5000 });

    // 6. Verify print-only elements are in the DOM
    const printHeader = page.locator("text=/Product Stock Adjustment & Audit Report/i");
    await expect(printHeader).toBeAttached();

    const signoffSection = page.locator("text=/Prepared & Verified By/i");
    await expect(signoffSection).toBeAttached();

    // 7. Spy on window.print and verify button triggers print
    await page.evaluate(() => {
      (window as any).__printed = false;
      window.print = () => {
        (window as any).__printed = true;
      };
    });

    await printBtn.click();
    await page.waitForTimeout(200);

    const printed = await page.evaluate(() => (window as any).__printed);
    expect(printed).toBe(true);

    // 8. Adjust stock and verify report metrics update
    const adjustBtn = page.locator('button:has-text("Adjust Stock")').first();
    await adjustBtn.click();

    // Fill modal form
    const qtyInput = page.locator('input[type="number"], input[name="quantity"]').first();
    await qtyInput.waitFor({ state: "visible", timeout: 5000 });
    await qtyInput.fill("10");

    const noteInput = page.locator('input[placeholder*="note" i], textarea, input[name="note"]').first();
    if (await noteInput.isVisible().catch(() => false)) {
      await noteInput.fill("Received warehouse restock batch");
    }

    const saveAdjustmentBtn = page.locator('button:has-text("Save Adjustment"), button:has-text("Confirm"), button:has-text("Save")').last();
    await saveAdjustmentBtn.click();

    // Wait for adjustment to reflect
    await page.waitForTimeout(1000);
    await page.reload();

    // Verify adjustment log row appears
    await expect(page.locator("text=/Received/i").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/+10/").first()).toBeVisible({ timeout: 10000 });

    // Verify compact print button also triggers print
    await page.evaluate(() => {
      (window as any).__printed = false;
      window.print = () => {
        (window as any).__printed = true;
      };
    });

    await compactPrintBtn.click();
    await page.waitForTimeout(200);

    const printedCompact = await page.evaluate(() => (window as any).__printed);
    expect(printedCompact).toBe(true);
  });
});
