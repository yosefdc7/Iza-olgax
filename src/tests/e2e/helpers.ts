import { Page } from "@playwright/test";

export async function loginAsAdmin(page: Page) {
  await page.goto("http://localhost:3000/login");

  // Fast path: use quick-pin-admin if present
  const quickAdmin = page.locator("#quick-pin-admin");
  if (await quickAdmin.isVisible({ timeout: 5000 }).catch(() => false)) {
    await quickAdmin.click();
    await page.waitForURL(/\/pos/, { timeout: 15000 });
    return;
  }

  // Keypad click path: 1-2-3-4
  const keypad1 = page.locator("#keypad-1");
  if (await keypad1.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.click("#keypad-1");
    await page.click("#keypad-2");
    await page.click("#keypad-3");
    await page.click("#keypad-4");
    await page.waitForURL(/\/pos/, { timeout: 15000 });
    return;
  }

  // Password fallback mode
  const toggleBtn = page.locator("#toggle-password-login");
  if (await toggleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await toggleBtn.click();
  }
  await page.fill('input[type="email"]', "admin@example.com");
  await page.fill('input[type="password"]', "admin123456");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/pos/, { timeout: 25000 });
}

export async function loginAsCashier(page: Page) {
  await page.goto("http://localhost:3000/login");

  // Fast path: use quick-pin-cashier if present
  const quickCashier = page.locator("#quick-pin-cashier");
  if (await quickCashier.isVisible({ timeout: 5000 }).catch(() => false)) {
    await quickCashier.click();
    await page.waitForURL(/\/pos/, { timeout: 15000 });
    return;
  }

  // Keypad click path: 5-6-7-8
  const keypad5 = page.locator("#keypad-5");
  if (await keypad5.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.click("#keypad-5");
    await page.click("#keypad-6");
    await page.click("#keypad-7");
    await page.click("#keypad-8");
    await page.waitForURL(/\/pos/, { timeout: 15000 });
    return;
  }

  const toggleBtn = page.locator("#toggle-password-login");
  if (await toggleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await toggleBtn.click();
  }
  await page.fill('input[type="email"]', "cashier@example.com");
  await page.fill('input[type="password"]', "cashier123456");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/pos/, { timeout: 25000 });
}
