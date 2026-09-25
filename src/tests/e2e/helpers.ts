import { Page } from "@playwright/test";

export async function loginAsAdmin(page: Page) {
  if (page.url().includes("/pos")) return;
  await page.goto("http://localhost:3000/login?logout=1");
  const quickAdmin = page.locator("#quick-pin-admin");
  if (await quickAdmin.isVisible({ timeout: 10000 }).catch(() => false)) {
    await quickAdmin.click();
    await page.waitForURL(/\/pos/, { waitUntil: "domcontentloaded", timeout: 30000 });
    return;
  }

  const keypad1 = page.locator("#keypad-1");
  await keypad1.waitFor({ state: "visible", timeout: 15000 });
  await page.click("#keypad-1");
  await page.click("#keypad-2");
  await page.click("#keypad-3");
  await page.click("#keypad-4");
  await page.waitForURL(/\/pos/, { waitUntil: "domcontentloaded", timeout: 30000 });
}

export async function loginAsCashier(page: Page) {
  await page.goto("http://localhost:3000/login?logout=1");
  const quickCashier = page.locator("#quick-pin-cashier");
  if (await quickCashier.isVisible({ timeout: 10000 }).catch(() => false)) {
    await quickCashier.click();
    await page.waitForURL(/\/pos/, { waitUntil: "domcontentloaded", timeout: 30000 });
    return;
  }

  const keypad5 = page.locator("#keypad-5");
  await keypad5.waitFor({ state: "visible", timeout: 15000 });
  await page.click("#keypad-5");
  await page.click("#keypad-6");
  await page.click("#keypad-7");
  await page.click("#keypad-8");
  await page.waitForURL(/\/pos/, { waitUntil: "domcontentloaded", timeout: 30000 });
}

export async function logoutUser(page: Page) {
  try {
    await page.evaluate(() => {
      localStorage.removeItem("izah_session_token");
      localStorage.removeItem("izah-pos-cart");
      document.cookie = "izah_session_token=; path=/; max-age=0";
      document.cookie = "better-auth.session_token=; path=/; max-age=0";
      document.cookie = "__Secure-better-auth.session_token=; path=/; max-age=0";
    });
  } catch {}

  await page.goto("http://localhost:3000/login?logout=1");
  await page.waitForSelector("#quick-pin-cashier, #quick-pin-admin, #keypad-1", { timeout: 20000 });
}

export async function clearCart(page: Page) {
  await page.evaluate(() => {
    try {
      localStorage.removeItem("izah-pos-cart");
      window.dispatchEvent(new Event("storage"));
    } catch {}
  });
}

export async function cleanupTestEntities(prefix: string = "E2E-AUTO-") {
  try {
    const res = await fetch("http://localhost:3000/api/test/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix }),
    });
    if (!res.ok) {
      console.warn("[cleanupTestEntities] Cleanup endpoint returned", res.status);
    }
  } catch (err) {
    console.warn("[cleanupTestEntities] Non-critical cleanup error:", err);
  }
}
