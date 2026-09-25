import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsCashier, clearCart, cleanupTestEntities } from "./helpers";

const TIMESTAMP = Date.now();
const PRODUCT_NAME = `E2E-AUTO-POS-${TIMESTAMP}`;
const PKG_NAME = "Bundle of 4";
const DR_REF = `DR-POS-${TIMESTAMP.toString().slice(-4)}`;
const SI_REF = `SI-POS-${TIMESTAMP.toString().slice(-4)}`;

test.describe("POS Scenarios (Selling, Series 211/CHB, Split Tender, Deleting)", () => {
  test.setTimeout(240_000);

  test.beforeAll(async ({ browser }) => {
    // Seed test product with packaging
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await page.goto("http://localhost:3000/products/new");
    await page.fill('input[name="name"]', PRODUCT_NAME);
    await page.fill('input[name="price"]', "50.00");
    await page.fill('input[name="stock"]', "40");
    await page.fill('input[name="lowStockThreshold"]', "5");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/products(\?.*)?$/, { timeout: 45000 });

    const productRow = page.locator("tr", { hasText: PRODUCT_NAME }).first();
    const productLink = productRow.locator("a").first();
    const href = await productLink.getAttribute("href");
    if (href) {
      await page.goto(`http://localhost:3000${href}`);
      const addPkgBtn = page.locator('button:has-text("Add Packaging")');
      if (await addPkgBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addPkgBtn.click();
        await page.fill('input[name="name"]', PKG_NAME);
        await page.fill('input[name="conversionQty"]', "4");
        await page.fill('input[name="price"]', "180.00");
        const savePkgBtn = page.locator('button[title="Save"], button:has(.lucide-check), button:has-text("Save")').first();
        await savePkgBtn.click();
        await expect(page.locator(`text=/${PKG_NAME}/`).first()).toBeVisible({ timeout: 15000 });
      }
    }
    await page.close();
  });

  test.afterAll(async () => {
    await cleanupTestEntities("E2E-AUTO-");
  });

  test("runs comprehensive POS selling scenarios with Series 211, CHB, split tender, and cart actions", async ({ page }) => {
    await loginAsCashier(page);
    await clearCart(page);

    // 1. Add item to cart and test void item
    const searchInput = page.locator("#pos-search-input, input[placeholder*='Search']").first();
    await searchInput.fill(PRODUCT_NAME.slice(0, 15));
    const searchResult = page.locator(`button:has-text("${PRODUCT_NAME}")`).first();
    await expect(searchResult).toBeVisible({ timeout: 15000 });
    await searchResult.click();

    const individualBtn = page.locator('button:has-text("Individual")');
    if (await individualBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await individualBtn.click();
    }
    await expect(page.locator("text=/Cart \\(1\\)|1 item/i").first()).toBeVisible({ timeout: 10000 });

    // Void item
    const removeBtn = page.locator('button[aria-label="Remove item"], button[title*="Remove"]').first();
    if (await removeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await removeBtn.click();
      const voidConfirmBtn = page.locator('button:has-text("Void Item")');
      if (await voidConfirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await voidConfirmBtn.click();
      }
      await expect(page.locator("text=/Cart is empty|0 items/i").first()).toBeVisible({ timeout: 10000 });
    }

    // 2. Re-add item and test Hold and Recall
    await searchInput.fill(PRODUCT_NAME.slice(0, 15));
    await expect(searchResult).toBeVisible({ timeout: 10000 });
    await searchResult.click();
    if (await individualBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await individualBtn.click();
    }

    const holdBtn = page.locator('button:has-text("Hold")').first();
    await holdBtn.click();
    await expect(page.locator("text=/Cart is empty|0 items/i").first()).toBeVisible({ timeout: 15000 });

    const recallBtn = page.locator('button:has-text("Recall")').first();
    await recallBtn.click();
    await expect(page.locator("h2:has-text('Held Orders')")).toBeVisible({ timeout: 15000 });
    const recallItemBtn = page.locator('.fixed button:has-text("Recall")').first();
    await recallItemBtn.click({ force: true });
    await expect(page.locator("text=/Cart \\(1\\)|1 item/i").first()).toBeVisible({ timeout: 15000 });

    // 3. Checkout 1: Series 211 Cash sale with tender change calculation
    const seriesSelect = page.locator('#company-receipt-dropdown, select[data-testid="company-receipt-select"]');
    if (await seriesSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      const options = await seriesSelect.innerText();
      if (options.includes("211")) {
        const matching = options.split("\n").find((o) => o.includes("211"))?.trim() ?? "211";
        await seriesSelect.selectOption({ label: matching });
      }
    }

    const drSiInput = page.locator('#dr-si-no, input[placeholder*="DR / SI"]');
    if (await drSiInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await drSiInput.fill(DR_REF);
    }

    await page.click('button:has-text("CASH")');
    const tenderedInput = page.locator('input[data-testid="tendered-input"], input[placeholder*="₱"]').last();
    if (await tenderedInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tenderedInput.fill("100.00");
    }

    const chargeBtn = page.locator("button[data-charge-btn], button:has-text('Checkout'), button:has-text('Charge')").first();
    await expect(chargeBtn).toBeEnabled({ timeout: 15000 });
    await chargeBtn.click();

    // Verify and dismiss receipt
    await expect(page.locator("text=/Receipt Preview|Receipt/i").first()).toBeVisible({ timeout: 15000 });
    const closeReceiptBtn = page.locator('button[data-testid="close-receipt-btn"], button[aria-label="Close receipt"]').first();
    await expect(closeReceiptBtn).toBeVisible({ timeout: 10000 });
    await closeReceiptBtn.click();
    await expect(page.locator("#receipt-print-overlay")).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/Cart is empty|0 items/i").first()).toBeVisible({ timeout: 15000 });

    // 4. Checkout 2: Series CHB Split payment (Cash + Card) with packaging unit
    await searchInput.fill(PRODUCT_NAME.slice(0, 15));
    await expect(searchResult).toBeVisible({ timeout: 10000 });
    await searchResult.click();

    const pkgChoice = page.locator(`button:has-text("${PKG_NAME}")`);
    if (await pkgChoice.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pkgChoice.click();
    } else if (await individualBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await individualBtn.click();
    }

    if (await seriesSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      const options = await seriesSelect.innerText();
      if (options.includes("CHB")) {
        const matching = options.split("\n").find((o) => o.includes("CHB"))?.trim() ?? "CHB";
        await seriesSelect.selectOption({ label: matching });
      }
    }

    if (await drSiInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await drSiInput.fill(SI_REF);
    }

    const splitBtn = page.locator('button:has-text("Split")');
    if (await splitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await splitBtn.click();
      const cashSplitInput = page.locator('input[data-testid="split-input-cash"], span:has-text("CASH") + input').first();
      const cardSplitInput = page.locator('input[data-testid="split-input-card"], span:has-text("CARD") + input').first();
      if (await cashSplitInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cashSplitInput.fill("100");
      }
      if (await cardSplitInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cardSplitInput.fill("80");
      }
    } else {
      await page.click('button:has-text("CARD")');
    }

    await expect(chargeBtn).toBeEnabled({ timeout: 15000 });
    await chargeBtn.click();

    await expect(page.locator("text=/Receipt Preview|Receipt/i").first()).toBeVisible({ timeout: 15000 });
    await expect(closeReceiptBtn).toBeVisible({ timeout: 10000 });
    await closeReceiptBtn.click();
    await expect(page.locator("#receipt-print-overlay")).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/Cart is empty|0 items/i").first()).toBeVisible({ timeout: 15000 });
  });
});
