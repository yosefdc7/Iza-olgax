import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsCashier, clearCart, cleanupTestEntities } from "./helpers";

const TIMESTAMP = Date.now();
const PRODUCT_NAME = `E2E-AUTO-Refund-${TIMESTAMP}`;

test.describe("Sales Lookup, Refund & Restock E2E", () => {
  test.setTimeout(240_000);

  test.afterAll(async () => {
    await cleanupTestEntities("E2E-AUTO-");
  });

  test("completes checkout, locates sale in Sales History, issues refund, and verifies restock", async ({ page }) => {
    // 1. Admin creates product with stock 10
    await loginAsAdmin(page);
    await page.goto("http://localhost:3000/products/new");
    await page.fill('input[name="name"]', PRODUCT_NAME);
    await page.fill('input[name="price"]', "250.00");
    await page.fill('input[name="stock"]', "10");
    await page.fill('input[name="lowStockThreshold"]', "2");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/products(\?.*)?$/, { timeout: 45000 });

    // 2. Cashier checks out 2 units
    await page.goto("http://localhost:3000/pos");
    await clearCart(page);

    const searchInput = page.locator("#pos-search-input, input[placeholder*='Search']").first();
    await searchInput.fill(PRODUCT_NAME.slice(0, 15));
    const searchResult = page.locator(`button:has-text("${PRODUCT_NAME}")`).first();
    await expect(searchResult).toBeVisible({ timeout: 15000 });
    await searchResult.click();

    // Increase qty to 2
    const increaseBtn = page.locator('button[aria-label="Increase quantity"], button:has-text("+")').first();
    if (await increaseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await increaseBtn.click();
    }

    // Wait for receipt series to be loaded and select
    const seriesSelect = page.locator('#company-receipt-dropdown, select[data-testid="company-receipt-select"]');
    await expect(seriesSelect).toBeVisible({ timeout: 15000 });
    await expect(seriesSelect).not.toContainText("Loading", { timeout: 15000 });
    const options = await seriesSelect.innerText();
    if (options.includes("211")) {
      const matching = options.split("\n").find((o) => o.includes("211"))?.trim() ?? "211";
      await seriesSelect.selectOption({ label: matching });
    }

    // Checkout
    await page.click('button:has-text("CASH")');
    const tenderedInput = page.locator('input[data-testid="tendered-input"], input[placeholder*="₱"]').last();
    if (await tenderedInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tenderedInput.fill("500.00");
    }

    const chargeBtn = page.locator("button[data-charge-btn], button:has-text('Checkout'), button:has-text('Charge')").first();
    await expect(chargeBtn).toBeEnabled({ timeout: 15000 });
    await chargeBtn.click();

    // Close receipt modal
    await expect(page.locator("text=/Receipt Preview|Receipt/i").first()).toBeVisible({ timeout: 45000 });
    const closeReceiptBtn = page.locator('button[data-testid="close-receipt-btn"], button[aria-label="Close receipt"]').first();
    await expect(closeReceiptBtn).toBeVisible({ timeout: 30000 });
    await closeReceiptBtn.click();
    await expect(page.locator("#receipt-print-overlay")).not.toBeVisible({ timeout: 20000 });

    // 3. Navigate to /sales and locate the transaction
    await page.goto("http://localhost:3000/sales");
    await expect(page.locator("h1").first()).toHaveText(/Sales History|Sales/i);

    const firstSaleRow = page.locator("table tbody tr").first();
    await expect(firstSaleRow).toBeVisible({ timeout: 15000 });
    await expect(firstSaleRow).toContainText("COMPLETED");

    // Click Refund button
    const refundBtn = firstSaleRow.locator('button[title*="Refund"], button:has-text("Refund")').first();
    await expect(refundBtn).toBeVisible({ timeout: 10000 });
    await refundBtn.click();

    // Refund Modal should open
    await expect(page.locator("text=/Issue Refund|Refund Sale/i").first()).toBeVisible({ timeout: 10000 });
    const confirmRefundBtn = page.locator('button[type="submit"]:has-text("Refund"), button:has-text("Confirm Refund")').first();
    await expect(confirmRefundBtn).toBeVisible({ timeout: 5000 });

    const refundResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/refund") && resp.status() === 200,
      { timeout: 45000 }
    );
    await confirmRefundBtn.click();
    await refundResponsePromise;

    // Dismiss refund receipt
    const closeRefundReceiptBtn = page.locator('button[data-testid="close-refund-receipt-btn"], button[aria-label="Close refund receipt"], button:has(.lucide-x)').first();
    if (await closeRefundReceiptBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
      await closeRefundReceiptBtn.click({ force: true });
    } else {
      await page.keyboard.press("Escape");
    }

    // 4. Verify status badge updated to REFUNDED
    await page.goto("http://localhost:3000/sales");
    await expect(page.locator("table tbody tr").first()).toContainText(/REFUNDED/i, { timeout: 15000 });

    // 5. Verify product stock restored to 10
    await page.goto("http://localhost:3000/products");
    const targetProductRow = page.locator("tr", { hasText: PRODUCT_NAME }).first();
    await expect(targetProductRow).toBeVisible({ timeout: 15000 });
    await expect(targetProductRow).toContainText("10");
  });
});
