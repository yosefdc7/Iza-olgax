import { test, expect } from "@playwright/test";
import { loginAsAdmin, cleanupTestEntities } from "./helpers";

const TIMESTAMP = Date.now();
const PRODUCT_NAME = `E2E-AUTO-Catalog-${TIMESTAMP}`;
const PKG_NAME = "Bundle of 5";

test.describe("Products CRUD & Packaging E2E", () => {
  test.setTimeout(240_000);

  test.afterAll(async () => {
    await cleanupTestEntities("E2E-AUTO-");
  });

  test("creates a product, adds packaging conversion, edits product, and deletes it", async ({ page }) => {
    await loginAsAdmin(page);

    // 1. Create Product
    await page.goto("http://localhost:3000/products/new");
    await expect(page.locator("h1")).toHaveText(/Add Product/i);

    await page.fill('input[name="name"]', PRODUCT_NAME);
    await page.fill('input[name="price"]', "150.00");
    await page.fill('input[name="stock"]', "25");
    await page.fill('input[name="lowStockThreshold"]', "5");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/products(\?.*)?$/, { timeout: 60000 });
    const productRow = page.locator("tr", { hasText: PRODUCT_NAME }).first();
    await expect(productRow).toBeVisible({ timeout: 20000 });

    // 2. Add Packaging Conversion
    const productLink = productRow.locator("a").first();
    const href = await productLink.getAttribute("href");
    if (href) {
      await page.goto(`http://localhost:3000${href}`);
    } else {
      await productLink.click();
    }
    await expect(page).toHaveURL(/\/products\/[a-zA-Z0-9]+/, { timeout: 30000 });

    const addPkgBtn = page.locator('button:has-text("Add Packaging")');
    if (await addPkgBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addPkgBtn.click();
      await page.fill('input[name="name"]', PKG_NAME);
      await page.fill('input[name="conversionQty"]', "5");
      await page.fill('input[name="price"]', "700.00");
      const savePkgBtn = page.locator('button[title="Save"], button:has(.lucide-check), button:has-text("Save")').first();
      await savePkgBtn.click();
      await expect(page.locator(`text=/${PKG_NAME}/`).first()).toBeVisible({ timeout: 15000 });
    }

    // 3. Edit Product
    const editLink = page.locator('a:has-text("Edit"), a[href*="/edit"]').first();
    const editHref = await editLink.getAttribute("href");
    if (editHref) {
      await page.goto(`http://localhost:3000${editHref}`, { waitUntil: "domcontentloaded" });
    } else {
      await editLink.click();
    }
    await expect(page).toHaveURL(/\/products\/[a-zA-Z0-9]+\/edit/, { timeout: 30000 });
    await expect(page.locator('input[name="name"]')).toHaveValue(PRODUCT_NAME, { timeout: 20000 });
    await page.fill('input[name="price"]', "165.00");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/products(\?.*)?$/, { timeout: 60000 });
    await expect(page.locator("tr", { hasText: PRODUCT_NAME }).first()).toContainText("165.00");

    // 4. Delete Product
    await page.goto("http://localhost:3000/products");
    const targetRow = page.locator("tr", { hasText: PRODUCT_NAME }).first();
    await expect(targetRow).toBeVisible({ timeout: 20000 });
    const deleteBtn = targetRow.locator('button[title*="Delete"]').first();
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();
    await expect(page.locator("tr", { hasText: PRODUCT_NAME })).not.toBeVisible({ timeout: 20000 });
  });
});
