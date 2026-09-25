# Grill: E2E Testing Scenarios (Adding, Selling, Deleting, Generating Reports)
Date: 2026-09-24

## Intent
Provide robust, comprehensive browser-based Playwright end-to-end (E2E) testing across the complete store lifecycle. Scenarios cover adding catalog items and packaging units, POS selling with company receipt series (211 vs CHB), DR/SI booklet references, split payments, deleting (cart items, held orders, catalog products, and refunding/voiding sales), and generating/exporting daily sales ledger reports with base price vs selling price verification.

## Constraints
- Must run as real browser UI tests using Playwright (`npx playwright test`) in headless Chromium.
- Must execute cleanly and reliably in local/CI environments against `http://localhost:3000`.
- Must keep the database clean and tests idempotent using automated cleanup (`afterAll` DB hooks for entities prefixed with `E2E-AUTO-`).
- Must support multi-role authentication (Admin PIN `1234` vs Cashier PIN `5678`).

## Key decisions
- Decision: Use Playwright browser UI tests instead of purely API-level scripts. Reason: Validates real DOM events, modals, dropdowns, and user experience. Alternative considered: API-only script runner (`scripts/run-e2e-comprehensive.ts`).
- Decision: Provide both a unified full-day lifecycle journey spec AND dedicated modular specs. Reason: The unified spec verifies the complete connected flow across roles and screens, while modular specs provide focused fast debugging for individual features. Alternative considered: Only modular specs or only a monolithic script.
- Decision: Cover all four deletion types (cart item removal, held order discard, catalog product deletion, and sale void/refund with stock restoration). Reason: Ensures full lifecycle testing of destructive and state-reversal actions. Alternative considered: Cart-only or catalog-only deletions.
- Decision: Validate both Series 211 (Cash with change) and Series CHB (Split payment Cash+Card with packaging conversion and DR/SI tracking). Reason: Directly verifies the newly implemented dual receipt series and packaging unit features. Alternative considered: Single payment type without series breakdown.
- Decision: Validate Daily Sales Ledger report UI cards, series breakdown, Base vs Selling price, and verify CSV file download. Reason: Assures business reporting matches the required physical audit ledger and Excel structure. Alternative considered: Visual table check without CSV export assertion.
- Decision: Multi-role test flow. Reason: Admin handles catalog creation/deletion and reporting; Cashier handles checkout and cart management, validating role-based authorization in practice. Alternative considered: Running all tests under Admin.

## Surfaced assumptions
- Test database already has seeded receipt series `211` and `CHB` (seeded via setup/migration).
- Next.js development or production server runs on port 3000 during Playwright execution.
- Downloaded CSV files can be inspected in Playwright via `page.waitForEvent('download')`.

## Out of scope
- Physical thermal hardware printer testing (receipt preview modal is tested instead of physical ESC/POS hardware spooling).
- External payment gateway mock handshakes (Card/GCash treated as recorded POS payment tender lines).
