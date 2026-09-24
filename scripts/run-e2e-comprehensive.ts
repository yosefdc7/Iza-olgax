import { prisma } from "../src/lib/db";

const BASE_URL = "http://localhost:3000";

interface TestResult {
  step: string;
  name: string;
  passed: boolean;
  details?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runStep(step: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  process.stdout.write(`\n⏳ [${step}] ${name} ... `);
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ step, name, passed: true, durationMs });
    console.log(`✅ PASSED (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const msg = err?.message || String(err);
    results.push({ step, name, passed: false, details: msg, durationMs });
    console.log(`❌ FAILED (${durationMs}ms)\n   Error: ${msg}`);
  }
}

async function main() {
  console.log("================================================================================");
  console.log("           IZAH POS - COMPREHENSIVE END-TO-END SYSTEM TEST SUITE                ");
  console.log("================================================================================");
  console.log(`Target Server: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  let adminToken = "";
  let cashierToken = "";
  let testProductId = "";
  let testCustomerId = "";
  let testPackagingId = "";
  let testSale1Id = "";
  let testSale1ItemId = "";
  let testSale2Id = "";
  let series211Id = "";
  let seriesChbId = "";

  // ---------------------------------------------------------------------------
  // STEP 1: Server & Database Health
  // ---------------------------------------------------------------------------
  await runStep("STEP 1", "Verify Server Health and Database Connectivity", async () => {
    const res = await fetch(`${BASE_URL}/api/ping`);
    if (!res.ok) throw new Error(`Health ping failed with HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ok && data.status !== "ok") {
      throw new Error(`Unexpected ping response: ${JSON.stringify(data)}`);
    }
  });

  // ---------------------------------------------------------------------------
  // STEP 2: Unauthenticated Security & Route Protection
  // ---------------------------------------------------------------------------
  await runStep("STEP 2", "Verify Unauthenticated Security & Route Protection", async () => {
    const res = await fetch(`${BASE_URL}/api/users`, { redirect: "manual" });
    if (res.status !== 401 && res.status !== 307 && res.status !== 403) {
      throw new Error(`Expected protected endpoint to reject unauthenticated request, got HTTP ${res.status}`);
    }
  });

  // ---------------------------------------------------------------------------
  // STEP 3: Staff Profile Discovery
  // ---------------------------------------------------------------------------
  await runStep("STEP 3", "Fetch Staff Profiles for POS Keypad Login", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/staff`);
    if (!res.ok) throw new Error(`Failed to fetch staff: HTTP ${res.status}`);
    const data = await res.json();
    if (!data.users || data.users.length < 2) {
      throw new Error(`Expected at least 2 staff users (Admin & Cashier), found ${data.users?.length}`);
    }
    const admin = data.users.find((u: any) => u.role === "ADMIN");
    const cashier = data.users.find((u: any) => u.role === "CASHIER");
    if (!admin) throw new Error("Admin user not found in staff list");
    if (!cashier) throw new Error("Cashier user not found in staff list");
  });

  // ---------------------------------------------------------------------------
  // STEP 4: Authentication & PIN Login Security
  // ---------------------------------------------------------------------------
  await runStep("STEP 4.1", "Reject Invalid PIN Login (Wrong PIN: 9999)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/pin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "9999" }),
    });
    if (res.status !== 401) throw new Error(`Expected 401 for wrong PIN, got ${res.status}`);
    const data = await res.json();
    if (!data.error) throw new Error("Expected error message for wrong PIN");
  });

  await runStep("STEP 4.2", "Cashier PIN Login (PIN: 5678)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/pin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "5678" }),
    });
    if (!res.ok) throw new Error(`Cashier login failed with HTTP ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error("No session token returned for cashier");
    cashierToken = data.token;
  });

  await runStep("STEP 4.3", "Admin PIN Login (PIN: 1234)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/pin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "1234" }),
    });
    if (!res.ok) throw new Error(`Admin login failed with HTTP ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error("No session token returned for admin");
    adminToken = data.token;
  });

  // ---------------------------------------------------------------------------
  // STEP 5: Role-Based Access Control (RBAC) Verification
  // ---------------------------------------------------------------------------
  await runStep("STEP 5", "Verify RBAC: Cashier Forbidden (403), Admin Authorized (200)", async () => {
    // Cashier request to /api/users (ADMIN only)
    const cashierRes = await fetch(`${BASE_URL}/api/users`, {
      headers: {
        Cookie: `izah_session_token=${cashierToken}; better-auth.session_token=${cashierToken}`,
        "izah-session-token": cashierToken,
      },
    });
    if (cashierRes.status !== 403) {
      throw new Error(`Expected Cashier to receive 403 Forbidden, got HTTP ${cashierRes.status}`);
    }

    // Admin request to /api/users
    const adminRes = await fetch(`${BASE_URL}/api/users`, {
      headers: {
        Cookie: `izah_session_token=${adminToken}; better-auth.session_token=${adminToken}`,
        "izah-session-token": adminToken,
      },
    });
    if (!adminRes.ok) throw new Error(`Admin failed to access users: HTTP ${adminRes.status}`);
    const data = await adminRes.json();
    if (!Array.isArray(data.users)) throw new Error("Expected users array in admin response");
  });

  // ---------------------------------------------------------------------------
  // STEP 6: Company Receipt Series Dropdown (211 & CHB)
  // ---------------------------------------------------------------------------
  await runStep("STEP 6", "Verify Company Receipt Series Dropdown Selection (211 & CHB)", async () => {
    const res = await fetch(`${BASE_URL}/api/receipt-series`, {
      headers: {
        Cookie: `izah_session_token=${adminToken}; better-auth.session_token=${adminToken}`,
        "izah-session-token": adminToken,
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch receipt series: HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.series)) throw new Error("Expected series array in response");

    const series211 = data.series.find((s: any) => s.name.toUpperCase() === "211");
    const seriesChb = data.series.find((s: any) => s.name.toUpperCase() === "CHB");

    if (!series211) throw new Error("Company Receipt Series '211' not found");
    if (!seriesChb) throw new Error("Company Receipt Series 'CHB' not found");

    series211Id = series211.id;
    seriesChbId = seriesChb.id;
  });

  // ---------------------------------------------------------------------------
  // STEP 7: Catalog & Inventory Management
  // ---------------------------------------------------------------------------
  await runStep("STEP 7.1", "Create New Product with Stock & Threshold", async () => {
    const timestamp = Date.now();
    const product = await prisma.product.create({
      data: {
        name: `E2E Arabica Coffee ${timestamp}`,
        sku: `E2E-COF-${timestamp}`,
        barcode: `E2E-BAR-${timestamp}`,
        price: 180.0,
        cost: 110.0,
        stock: 15,
        lowStockThreshold: 5,
        unit: "piece",
        category: "Beverages",
        active: true,
      },
    });

    if (!product || !product.id) throw new Error("Failed to create test product");
    testProductId = product.id;
  });

  await runStep("STEP 7.2", "Verify Product Search Indexing", async () => {
    const res = await fetch(`${BASE_URL}/api/products/search?q=Arabica`, {
      headers: {
        Cookie: `izah_session_token=${adminToken}; better-auth.session_token=${adminToken}`,
        "izah-session-token": adminToken,
      },
    });
    if (!res.ok) throw new Error(`Product search failed: HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.products;
    const found = list?.find((p: any) => p.id === testProductId);
    if (!found) throw new Error("Created product not found in search results");
  });

  await runStep("STEP 7.3", "Create Packaging Unit Conversion (Box of 10)", async () => {
    const packaging = await prisma.productPackaging.create({
      data: {
        productId: testProductId,
        name: "Box of 10",
        conversionQty: 10,
        price: 1700.0,
        barcode: `E2E-PKG-${Date.now()}`,
      },
    });
    if (!packaging) throw new Error("Failed to create packaging unit");
    testPackagingId = packaging.id;
  });

  // ---------------------------------------------------------------------------
  // STEP 8: Customer & Loyalty Management
  // ---------------------------------------------------------------------------
  await runStep("STEP 8", "Create Customer & Verify Loyalty Account", async () => {
    const phone = `0917${Math.floor(1000000 + Math.random() * 9000000)}`;
    const res = await fetch(`${BASE_URL}/api/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `izah_session_token=${adminToken}; better-auth.session_token=${adminToken}`,
        "izah-session-token": adminToken,
      },
      body: JSON.stringify({
        name: `E2E Sophia Martinez`,
        phone,
        email: `sophia.${Date.now()}@example.com`,
        notes: "VIP Gold Member",
      }),
    });
    if (!res.ok) throw new Error(`Customer creation failed: HTTP ${res.status}`);
    const data = await res.json();
    if (!data.customer?.id) throw new Error("Customer ID missing in response");
    testCustomerId = data.customer.id;
  });

  // ---------------------------------------------------------------------------
  // STEP 9: Held Orders (Order Suspension & Recall)
  // ---------------------------------------------------------------------------
  await runStep("STEP 9", "Hold and Recall Order in POS", async () => {
    // Create held order
    const holdRes = await fetch(`${BASE_URL}/api/held-orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `izah_session_token=${cashierToken}; better-auth.session_token=${cashierToken}`,
        "izah-session-token": cashierToken,
      },
      body: JSON.stringify({
        label: "Table 4 - E2E Test",
        cartSnapshot: {
          items: [{ productId: testProductId, quantity: 1 }],
          customerId: testCustomerId,
        },
      }),
    });
    if (!holdRes.ok) throw new Error(`Failed to hold order: HTTP ${holdRes.status}`);
    const held = await holdRes.json();
    if (!held.id) throw new Error("Held order ID missing");

    // Fetch held orders
    const listRes = await fetch(`${BASE_URL}/api/held-orders`, {
      headers: {
        Cookie: `izah_session_token=${cashierToken}; better-auth.session_token=${cashierToken}`,
        "izah-session-token": cashierToken,
      },
    });
    const orders = await listRes.json();
    const exists = orders.some((o: any) => o.id === held.id);
    if (!exists) throw new Error("Created held order not found in list");

    // Recall (delete) held order
    const delRes = await fetch(`${BASE_URL}/api/held-orders`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Cookie: `izah_session_token=${cashierToken}; better-auth.session_token=${cashierToken}`,
        "izah-session-token": cashierToken,
      },
      body: JSON.stringify({ id: held.id }),
    });
    if (!delRes.ok) throw new Error(`Failed to recall/delete held order: HTTP ${delRes.status}`);
  });

  // ---------------------------------------------------------------------------
  // STEP 10: POS Transaction 1 - Cash Sale with Change & Series 211
  // ---------------------------------------------------------------------------
  await runStep("STEP 10", "Complete Cash Sale with Company Series '211' & Tender Change", async () => {
    const res = await fetch(`${BASE_URL}/api/sales`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `izah_session_token=${cashierToken}; better-auth.session_token=${cashierToken}`,
        "izah-session-token": cashierToken,
      },
      body: JSON.stringify({
        items: [
          {
            productId: testProductId,
            quantity: 2, // 2 * 180 = 360
          },
        ],
        receiptSeriesId: series211Id,
        paymentMethod: "CASH",
        amountTendered: 500.0, // 500 tendered - 360 = 140 change
        customerId: testCustomerId,
        drSiNumber: "DR-2026-001",
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Sale creation failed: HTTP ${res.status} - ${errBody}`);
    }

    const data = await res.json();
    if (!data.sale || !data.sale.id) throw new Error("Sale ID missing in response");
    testSale1Id = data.sale.id;

    // Verify sale items and calculate change
    const saleItem = data.sale.items?.[0];
    if (!saleItem) throw new Error("Sale item missing in response");
    testSale1ItemId = saleItem.id;

    const tendered = Number(data.sale.amountTendered);
    const total = Number(data.sale.total);
    const change = tendered - total;
    if (Math.abs(change - 140.0) > 0.01) {
      throw new Error(`Expected change of 140.00, got ${change}`);
    }

    // Verify stock decremented by 2 (15 -> 13)
    const product = await prisma.product.findUnique({ where: { id: testProductId } });
    if (Number(product?.stock) !== 13) {
      throw new Error(`Expected stock to be 13, found ${product?.stock}`);
    }
  });

  // ---------------------------------------------------------------------------
  // STEP 11: POS Transaction 2 - Packaging Conversion & Split Payment (Cash + Card)
  // ---------------------------------------------------------------------------
  await runStep("STEP 11", "Complete Split Tender Sale with Packaging Conversion & Series 'CHB'", async () => {
    // Selling 1 Box of 10 converts to 10 base units deduction
    const res = await fetch(`${BASE_URL}/api/sales`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `izah_session_token=${cashierToken}; better-auth.session_token=${cashierToken}`,
        "izah-session-token": cashierToken,
      },
      body: JSON.stringify({
        items: [
          {
            productId: testProductId,
            packagingId: testPackagingId,
            quantity: 1, // 1 box @ 1700
          },
        ],
        receiptSeriesId: seriesChbId,
        paymentMethod: "OTHER",
        paymentLines: [
          { method: "CASH", amount: 1000.0 },
          { method: "CARD", amount: 700.0 },
        ],
        customerId: testCustomerId,
        drSiNumber: "CHB-SI-999",
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Split sale failed: HTTP ${res.status} - ${errBody}`);
    }

    const data = await res.json();
    testSale2Id = data.sale.id;

    // Verify stock decremented by 10 (13 -> 3)
    const product = await prisma.product.findUnique({ where: { id: testProductId } });
    if (Number(product?.stock) !== 3) {
      throw new Error(`Expected stock to be 3 after box deduction, found ${product?.stock}`);
    }
  });

  // ---------------------------------------------------------------------------
  // STEP 12: Automated Real-time Low-Stock Alerting
  // ---------------------------------------------------------------------------
  await runStep("STEP 12", "Verify Automated Low-Stock Alert Triggered (Stock 3 <= Threshold 5)", async () => {
    const res = await fetch(`${BASE_URL}/api/products/low-stock?limit=100`, {
      headers: {
        Cookie: `izah_session_token=${adminToken}; better-auth.session_token=${adminToken}`,
        "izah-session-token": adminToken,
      },
    });

    if (!res.ok) throw new Error(`Low stock query failed: HTTP ${res.status}`);
    const data = await res.json();
    const alertItem = data.items?.find((i: any) => i.id === testProductId);

    if (!alertItem) {
      throw new Error(`Product ${testProductId} with stock 3 not found in low-stock alerts list!`);
    }

    if (alertItem.stock !== 3 || alertItem.lowStockThreshold !== 5) {
      throw new Error(`Low stock data mismatch: stock=${alertItem.stock}, threshold=${alertItem.lowStockThreshold}`);
    }
  });

  // ---------------------------------------------------------------------------
  // STEP 13: Receipt Lookup & Verification
  // ---------------------------------------------------------------------------
  await runStep("STEP 13", "Verify Sale Receipt Lookup and Structure", async () => {
    const res = await fetch(`${BASE_URL}/api/sales/${testSale1Id}`, {
      headers: {
        Cookie: `izah_session_token=${adminToken}; better-auth.session_token=${adminToken}`,
        "izah-session-token": adminToken,
      },
    });

    if (!res.ok) throw new Error(`Receipt fetch failed: HTTP ${res.status}`);
    const data = await res.json();
    const sale = data.sale || data;

    if (!sale.invoiceNumber) throw new Error("Invoice number missing from receipt");
    if (!sale.items || sale.items.length === 0) throw new Error("Line items missing from receipt");
    if (!sale.receiptSeries?.name) throw new Error("Receipt series name missing from receipt");
  });

  // ---------------------------------------------------------------------------
  // STEP 14: Refund & Inventory Restocking
  // ---------------------------------------------------------------------------
  await runStep("STEP 14", "Issue Full Refund for Transaction 1 and Restock Inventory", async () => {
    const res = await fetch(`${BASE_URL}/api/sales/${testSale1Id}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `izah_session_token=${adminToken}; better-auth.session_token=${adminToken}`,
        "izah-session-token": adminToken,
      },
      body: JSON.stringify({
        reason: "Customer changed mind - E2E automated test",
        restoreStock: true,
        items: [
          {
            saleItemId: testSale1ItemId,
            quantity: 2,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Refund failed: HTTP ${res.status} - ${errBody}`);
    }

    const data = await res.json();
    if (!data.refund) throw new Error("Refund object missing in response");

    // Verify stock restored by 2 (3 -> 5)
    const product = await prisma.product.findUnique({ where: { id: testProductId } });
    if (Number(product?.stock) !== 5) {
      throw new Error(`Expected restocked inventory to be 5, found ${product?.stock}`);
    }
  });

  // ---------------------------------------------------------------------------
  // STEP 15: Daily Ledger & Financial Reporting
  // ---------------------------------------------------------------------------
  await runStep("STEP 15", "Generate Daily Ledger Summary Report", async () => {
    const res = await fetch(`${BASE_URL}/api/reports/daily-ledger`, {
      headers: {
        Cookie: `izah_session_token=${adminToken}; better-auth.session_token=${adminToken}`,
        "izah-session-token": adminToken,
      },
    });

    if (!res.ok) throw new Error(`Daily ledger query failed: HTTP ${res.status}`);
    const data = await res.json();
    if (!data.totals || typeof data.totalCount !== "number") {
      throw new Error("Ledger totals or totalCount metric missing in response");
    }
  });

  // ---------------------------------------------------------------------------
  // STEP 16: Database Cleanup
  // ---------------------------------------------------------------------------
  await runStep("STEP 16", "Clean Up Test Data Artifacts", async () => {
    if (testSale1Id) {
      await prisma.refund.deleteMany({ where: { saleId: testSale1Id } }).catch(() => {});
      await prisma.saleItem.deleteMany({ where: { saleId: testSale1Id } }).catch(() => {});
      await prisma.loyaltyLog.deleteMany({ where: { saleId: testSale1Id } }).catch(() => {});
      await prisma.sale.delete({ where: { id: testSale1Id } }).catch(() => {});
    }
    if (testSale2Id) {
      await prisma.refund.deleteMany({ where: { saleId: testSale2Id } }).catch(() => {});
      await prisma.saleItem.deleteMany({ where: { saleId: testSale2Id } }).catch(() => {});
      await prisma.loyaltyLog.deleteMany({ where: { saleId: testSale2Id } }).catch(() => {});
      await prisma.sale.delete({ where: { id: testSale2Id } }).catch(() => {});
    }
    if (testPackagingId) {
      await prisma.productPackaging.delete({ where: { id: testPackagingId } }).catch(() => {});
    }
    if (testProductId) {
      await prisma.product.delete({ where: { id: testProductId } }).catch(() => {});
    }
    if (testCustomerId) {
      await prisma.customer.delete({ where: { id: testCustomerId } }).catch(() => {});
    }
  });

  // ---------------------------------------------------------------------------
  // FINAL REPORT
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("                        E2E TEST EXECUTION SUMMARY                              ");
  console.log("================================================================================");

  let passedCount = 0;
  let failedCount = 0;

  for (const r of results) {
    const mark = r.passed ? "✅ [PASS]" : "❌ [FAIL]";
    console.log(`${mark} ${r.step}: ${r.name} (${r.durationMs}ms)`);
    if (r.details) {
      console.log(`         Error: ${r.details}`);
    }
    if (r.passed) passedCount++;
    else failedCount++;
  }

  console.log("--------------------------------------------------------------------------------");
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal test runner error:", e);
  process.exit(1);
});
