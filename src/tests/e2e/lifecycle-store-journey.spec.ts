import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsCashier, logoutUser, clearCart, cleanupTestEntities } from "./helpers";

const TIMESTAMP = Date.now();
const PRODUCT_NAME = `E2E-AUTO-Artisan-Coffee-${TIMESTAMP}`;
const PKG_NAME = "Box of 10";
const DR_211_REF = `DR-211-${TIMESTAMP.toString().slice(-4)}`;
const SI_CHB_REF = `SI-CHB-${TIMESTAMP.toString().slice(-4)}`;

test.describe("Full Store Lifecycle Journey E2E", () => {
  test.setTimeout(300_000);

  test.afterAll(async () => {
    await cleanupTestEntities("E2E-AUTO-");
  });

  test("completes complete end-to-end store day lifecycle across roles", async ({ page }) => {
    // -------------------------------------------------------------------------
    // PHASE 1: Admin Adds Product & Packaging Conversion
    // -------------------------------------------------------------------------
    await loginAsAdmin(page);

    // 1.1 Create base product
    await page.goto("http://localhost:3000/products/new");
    await expect(page.locator("h1")).toHaveText(/Add Product/i);

    await page.fill('input[name="name"]', PRODUCT_NAME);
    await page.fill('input[name="price"]', "120.00");
    await page.fill('input[name="stock"]', "30");
    await page.fill('input[name="lowStockThreshold"]', "5");
    await page.click('button[type="submit"]');

    // Verify redirected to /products and product exists in table
    await expect(page).toHaveURL(/\/products(\?.*)?$/, { timeout: 20000 });
    const productRow = page.locator("tr", { hasText: PRODUCT_NAME });
    await expect(productRow).toBeVisible({ timeout: 15000 });

    // 1.2 Navigate to product detail and add packaging conversion
    const productLink = productRow.locator("a").first();
    const href = await productLink.getAttribute("href");
    if (href) {
      await page.goto(`http://localhost:3000${href}`);
    } else {
      await productLink.click();
    }
    await expect(page).toHaveURL(/\/products\/[a-zA-Z0-9]+/, { timeout: 20000 });

    // Click "Add Packaging" in PackagingSection
    const addPkgBtn = page.locator('button:has-text("Add Packaging")');
    if (await addPkgBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addPkgBtn.click();
      await page.fill('input[name="name"]', PKG_NAME);
      await page.fill('input[name="conversionQty"]', "10");
      await page.fill('input[name="price"]', "1100.00");
      const savePkgBtn = page.locator('button[title="Save"], button:has(.lucide-check), button:has-text("Save")').first();
      await savePkgBtn.click();
      await expect(page.locator(`text=/${PKG_NAME}/`).first()).toBeVisible({ timeout: 15000 });
    }

    // -------------------------------------------------------------------------
    // PHASE 2: Switch to Cashier & Test Cart Deletion & Hold/Recall
    // -------------------------------------------------------------------------
    await logoutUser(page);
    await loginAsCashier(page);
    await clearCart(page);

    // 2.1 Add item to cart
    const searchInput = page.locator("#pos-search-input, input[placeholder*='Search']").first();
    await searchInput.fill(PRODUCT_NAME.slice(0, 15));
    const searchResult = page.locator(`button:has-text("${PRODUCT_NAME}")`).first();
    await expect(searchResult).toBeVisible({ timeout: 15000 });
    await searchResult.click();

    // If packaging picker popped up, choose individual unit
    const individualBtn = page.locator('button:has-text("Individual")');
    if (await individualBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await individualBtn.click();
    }

    // Verify cart has 1 item
    await expect(page.locator("text=/Cart \\(1\\)|1 item/i").first()).toBeVisible({ timeout: 10000 });

    // 2.2 Test Cart Item Deletion (Trash button & Void Modal)
    const removeCartItemBtn = page.locator('button[aria-label="Remove item"], button[title*="Remove"]').first();
    if (await removeCartItemBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await removeCartItemBtn.click();
      const voidConfirmBtn = page.locator('button:has-text("Void Item")');
      if (await voidConfirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await voidConfirmBtn.click();
      }
      await expect(page.locator("text=/Cart is empty|0 items/i").first()).toBeVisible({ timeout: 8000 });
    }

    // 2.3 Re-add item and test Hold and Recall
    await searchInput.fill(PRODUCT_NAME.slice(0, 15));
    await expect(searchResult).toBeVisible({ timeout: 10000 });
    await searchResult.click();
    if (await individualBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await individualBtn.click();
    }

    // Hold order
    const holdBtn = page.locator('button:has-text("Hold")').first();
    await holdBtn.click();
    await expect(page.locator("text=/Cart is empty|0 items/i").first()).toBeVisible({ timeout: 15000 });

    // Recall order
    const recallBtn = page.locator('button:has-text("Recall")').first();
    await recallBtn.click();
    await expect(page.locator("h2:has-text('Held Orders')")).toBeVisible({ timeout: 15000 });
    const recallItemBtn = page.locator('.fixed button:has-text("Recall")').first();
    await recallItemBtn.click({ force: true });
    await expect(page.locator("text=/Cart \\(1\\)|1 item/i").first()).toBeVisible({ timeout: 15000 });

    // -------------------------------------------------------------------------
    // PHASE 3: Transaction 1 - Series 211 Cash Sale with Tender Change & DR/SI
    // -------------------------------------------------------------------------
    // Select Company Receipt series 211
    const seriesSelect = page.locator('#company-receipt-dropdown, select[data-testid="company-receipt-select"]');
    if (await seriesSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      const options = await seriesSelect.innerText();
      if (options.includes("211")) {
        const matching = options.split("\n").find((o) => o.includes("211"))?.trim() ?? "211";
        await seriesSelect.selectOption({ label: matching });
      }
    }

    // Fill DR/SI booklet reference
    const drSiInput = page.locator('#dr-si-no, input[placeholder*="DR / SI"]');
    if (await drSiInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await drSiInput.fill(DR_211_REF);
    }

    // Select CASH payment and enter tendered amount with change
    await page.click('button:has-text("CASH")');
    const tenderedInput = page.locator('input[data-testid="tendered-input"], input[placeholder*="₱"], input[placeholder*="0.00"]').last();
    if (await tenderedInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tenderedInput.fill("200");
    }

    // Charge button
    const chargeBtn = page.locator("button[data-charge-btn], button:has-text('Checkout'), button:has-text('Charge')").first();
    await expect(chargeBtn).toBeEnabled({ timeout: 15000 });
    await chargeBtn.click();

    // Verify Receipt Preview modal and close it
    await expect(page.locator("text=/Receipt Preview|Receipt/i").first()).toBeVisible({ timeout: 15000 });
    const closeReceiptBtn = page.locator('button[data-testid="close-receipt-btn"], button[aria-label="Close receipt"]').first();
    await expect(closeReceiptBtn).toBeVisible({ timeout: 10000 });
    await closeReceiptBtn.click();
    await expect(page.locator("#receipt-print-overlay")).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/Cart is empty|0 items/i").first()).toBeVisible({ timeout: 15000 });

    // -------------------------------------------------------------------------
    // PHASE 4: Transaction 2 - Series CHB Split Payment with Packaging
    // -------------------------------------------------------------------------
    await searchInput.fill(PRODUCT_NAME.slice(0, 15));
    await expect(searchResult).toBeVisible({ timeout: 15000 });
    await searchResult.click();

    // Select Packaging unit if available
    const pkgChoice = page.locator(`button:has-text("${PKG_NAME}")`);
    if (await pkgChoice.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pkgChoice.click();
    } else if (await individualBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await individualBtn.click();
    }

    // Select Company Receipt Series CHB
    if (await seriesSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      const options = await seriesSelect.innerText();
      if (options.includes("CHB")) {
        const matching = options.split("\n").find((o) => o.includes("CHB"))?.trim() ?? "CHB";
        await seriesSelect.selectOption({ label: matching });
      }
    }

    // Fill DR/SI booklet reference for CHB
    if (await drSiInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await drSiInput.fill(SI_CHB_REF);
    }

    // Split payment
    const splitBtn = page.locator('button:has-text("Split")');
    if (await splitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await splitBtn.click();
      // Fill Cash 600 and Card 500 (total 1100) or respective amounts
      const cashSplitInput = page.locator('input[data-testid="split-input-cash"], span:has-text("CASH") + input').first();
      const cardSplitInput = page.locator('input[data-testid="split-input-card"], span:has-text("CARD") + input').first();
      if (await cashSplitInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cashSplitInput.fill("600");
      }
      if (await cardSplitInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cardSplitInput.fill("500");
      }
    } else {
      await page.click('button:has-text("CARD")');
    }

    await expect(chargeBtn).toBeEnabled({ timeout: 15000 });
    await chargeBtn.click();

    // Verify Receipt Preview modal and close it
    await expect(page.locator("text=/Receipt Preview|Receipt/i").first()).toBeVisible({ timeout: 15000 });
    await expect(closeReceiptBtn).toBeVisible({ timeout: 10000 });
    await closeReceiptBtn.click();
    await expect(page.locator("#receipt-print-overlay")).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=/Cart is empty|0 items/i").first()).toBeVisible({ timeout: 15000 });

    // -------------------------------------------------------------------------
    // PHASE 5: Admin Reports Verification (Ledger, DR/SI & CSV Export)
    // -------------------------------------------------------------------------
    await logoutUser(page);
    await loginAsAdmin(page);

    await page.goto("http://localhost:3000/reports");
    await expect(page.locator("h1")).toHaveText(/Reports/i);

    // Switch to Daily Sales Ledger tab if present
    const ledgerTab = page.locator('button:has-text("Daily Sales Ledger")');
    if (await ledgerTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ledgerTab.click();
    }

    // Verify summary metrics / cards exist
    await expect(page.locator("text=/Gross revenue|Receipts/i").first()).toBeVisible({ timeout: 12000 });

    // Verify CSV Download event
    const csvLink = page.locator('a:has-text("CSV")').first();
    if (await csvLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent("download", { timeout: 15000 }).catch(() => null);
      await csvLink.click();
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toContain(".csv");
      } else {
        const href = await csvLink.getAttribute("href");
        expect(href).toContain("format=csv");
      }
    }

    // -------------------------------------------------------------------------
    // PHASE 6: Product Catalog Deletion
    // -------------------------------------------------------------------------
    await page.goto("http://localhost:3000/products");
    await expect(page.locator("h1")).toHaveText(/Products/i);
    const targetProductRow = page.locator("tr", { hasText: PRODUCT_NAME }).first();
    if (await targetProductRow.isVisible({ timeout: 8000 }).catch(() => false)) {
      const deleteBtn = targetProductRow.locator('button[title*="Delete"]').first();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click();
        await expect(page.locator("tr", { hasText: PRODUCT_NAME })).not.toBeVisible({ timeout: 15000 });
      }
    }
  });
});
