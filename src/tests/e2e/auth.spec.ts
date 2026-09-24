import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

test.describe("Authentication", () => {
  test("redirects unauthenticated users to /login", async ({ page }) => {
    await page.goto(`${BASE}/pos`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows validation error with wrong PIN", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator("#pin-keypad")).toBeVisible({ timeout: 10000 });

    // Enter wrong PIN via keypad: 9999
    await page.click("#keypad-9");
    await page.click("#keypad-9");
    await page.click("#keypad-9");
    await page.click("#keypad-9");

    // Should display error message
    const errorEl = page.locator("#pin-error-text");
    await expect(errorEl).toBeVisible({ timeout: 10000 });
  });

  test("admin can log in with PIN and access settings", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator("#pin-keypad")).toBeVisible({ timeout: 10000 });

    // Click Admin quick-pin or keypad 1234
    const quickAdmin = page.locator("#quick-pin-admin");
    if (await quickAdmin.isVisible({ timeout: 2000 }).catch(() => false)) {
      await quickAdmin.click();
    } else {
      await page.click("#keypad-1");
      await page.click("#keypad-2");
      await page.click("#keypad-3");
      await page.click("#keypad-4");
    }

    await expect(page).toHaveURL(/\/pos/, { timeout: 20000 });

    // Should be able to access settings
    await page.goto(`${BASE}/settings`);
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("h1")).toHaveText("Settings");
  });

  test("can toggle to password mode and validate credentials", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    const toggleBtn = page.locator("#toggle-password-login");
    await expect(toggleBtn).toBeVisible({ timeout: 10000 });
    await toggleBtn.click();

    // Verify email and password inputs appear
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    // Test incorrect password
    await emailInput.fill("admin@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should stay on login and show error
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    const errorEl = page.locator("text=/invalid|incorrect|wrong|failed/i").first();
    await expect(errorEl).toBeVisible({ timeout: 15000 });
  });

  test("cashier is redirected away from settings", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator("#pin-keypad")).toBeVisible({ timeout: 10000 });

    // Log in as Cashier
    const quickCashier = page.locator("#quick-pin-cashier");
    if (await quickCashier.isVisible({ timeout: 2000 }).catch(() => false)) {
      await quickCashier.click();
    } else {
      await page.click("#keypad-5");
      await page.click("#keypad-6");
      await page.click("#keypad-7");
      await page.click("#keypad-8");
    }

    await expect(page).toHaveURL(/\/pos/, { timeout: 20000 });

    // Cashier navigating to settings gets redirected back to /pos
    await page.goto(`${BASE}/settings`);
    await expect(page).toHaveURL(/\/pos/);
  });
});
