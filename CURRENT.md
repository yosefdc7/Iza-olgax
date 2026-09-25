# CURRENT.md

## Objective
Implement and verify comprehensive Playwright browser-based end-to-end (E2E) testing across the complete store lifecycle: adding/editing/packaging units in catalog, selling at POS with Company Receipt series (211 vs CHB) and DR/SI tracking, deleting (cart void, hold/discard, catalog delete, sales refund with stock restock), and daily ledger report generation.

## Status
**100% of Playwright E2E browser test specifications and 168/168 unit tests passed with 0 failures.**

## Completed
- [x] **Unified Full-Day Store Lifecycle Spec (`src/tests/e2e/lifecycle-store-journey.spec.ts`)**:
  - Admin catalog creation and packaging conversion unit setup.
  - Cashier PIN authentication (`5678`), product search, cart item voiding, and order hold & recall.
  - Transaction 1: Series 211 Cash sale with tender change calculation, DR/SI booklet reference, and receipt preview modal.
  - Transaction 2: Series CHB Split payment (Cash + Card) with packaging conversion, DR/SI tracking, and receipt modal.
  - Admin login and Daily Sales Ledger report navigation, summary metric cards, and CSV export link.
  - Product catalog deletion and removal verification.
- [x] **Modular Feature Spec: Products CRUD & Packaging (`src/tests/e2e/products-crud.spec.ts`)**:
  - Product creation with base stock and low-stock threshold.
  - Packaging conversion unit creation (Bundle of 5 with conversion ratio).
  - Product editing (price modification) and catalog re-listing.
  - Product deletion and disappearance from table.
- [x] **Modular Feature Spec: POS Scenarios (`src/tests/e2e/pos-scenarios.spec.ts`)**:
  - Individual unit vs packaging option selection in POS cart.
  - Item void confirmation and cart clearing.
  - Hold order and Recall from held orders modal.
  - Series 211 Cash checkout with change due calculation.
  - Series CHB Split tender checkout (Cash + Card) with DR/SI tracking.
- [x] **Modular Feature Spec: Reports & Daily Ledger (`src/tests/e2e/reports-ledger.spec.ts`)**:
  - Daily Sales Ledger metric cards (Gross Revenue, Receipts count).
  - Series filter dropdown verification.
  - CSV report download link validation.
- [x] **Modular Feature Spec: Sales Lookup & Refund (`src/tests/e2e/sales-refund.spec.ts`)**:
  - Completed sale lookup in Sales History table (`/sales`).
  - Itemized refund execution with stock return option.
  - Automatic status badge update to REFUNDED.
  - Stock restock verification back in catalog.
- [x] **Full Regression Test Verification**:
  - 16 unit test suites, 168 unit and integration tests passed.

## Important Decisions
- **Dual Layout E2E Suite**: Provided both a unified sequential journey (`lifecycle-store-journey.spec.ts`) and modular targeted specs (`products-crud`, `pos-scenarios`, `reports-ledger`, `sales-refund`) for maximum flexibility and rapid debugging.
- **Protocol-Aware Session Cookies**: Made cookie setting protocol-aware (`secure: isHttps`) and dual-propagated Bearer tokens from `localStorage` in API calls so browser sessions persist seamlessly under local HTTP dev servers.
- **Modal Rendering Isolation**: Separated `RefundReceiptModal` rendering from `RefundModal` to prevent DOM overlay duplication and pointer event interception.
- **Automated Entity Teardown**: Tagged test products with `E2E-AUTO-` and added `/api/test/cleanup` endpoint for isolated and idempotent test runs.

## Changed Files
| File | Change |
|---|---|
| `src/tests/e2e/products-crud.spec.ts` | CREATED — Product CRUD & packaging conversion E2E test |
| `src/tests/e2e/pos-scenarios.spec.ts` | CREATED — POS selling, Series 211/CHB, split tender, and cart actions |
| `src/tests/e2e/reports-ledger.spec.ts` | CREATED — Daily Sales Ledger metrics, series filter, and CSV export |
| `src/tests/e2e/sales-refund.spec.ts` | CREATED — Sales lookup, refund execution, and inventory restock |
| `src/tests/e2e/lifecycle-store-journey.spec.ts` | CREATED — Unified full-day store journey spec |
| `src/tests/e2e/helpers.ts` | CREATED — E2E authentication helpers, cart clear, and cleanup caller |
| `src/app/api/test/cleanup/route.ts` | CREATED — Safe test fixture cleanup endpoint |
| `src/app/(app)/sales/page.tsx` | MODIFIED — Wrapped query result with `serialize()` to prevent Decimal object warnings |
| `public/sw.js` | MODIFIED — Updated precache to prevent `/icons/icon.svg` 404 |
| `public/icons/icon.svg` | CREATED — Added fallback SVG icon asset |
| `src/components/receipt/refund-receipt-modal.tsx` | MODIFIED — Added `data-testid` and `aria-label` to close button |
| `src/components/sales/refund-modal.tsx` | MODIFIED — Conditionally rendered receipt modal to prevent overlapping z-50 backdrops |
| `src/components/receipt/receipt-modal.tsx` | MODIFIED — Added `Escape` key and backdrop dismiss with `data-testid` |
| `src/proxy.ts` | MODIFIED — Made cookie security flag protocol-aware for localhost HTTP |
| `CURRENT.md` | MODIFIED — Updated with all test results and continuity state |

## Verification
- `bun x playwright test src/tests/e2e/products-crud.spec.ts`: **PASSED (1.1m)**
- `bun x playwright test src/tests/e2e/pos-scenarios.spec.ts`: **PASSED (1.3m)**
- `bun x playwright test src/tests/e2e/reports-ledger.spec.ts`: **PASSED (32.1s)**
- `bun x playwright test src/tests/e2e/sales-refund.spec.ts`: **PASSED (3.0m)**
- `bun x playwright test src/tests/e2e/lifecycle-store-journey.spec.ts`: **PASSED (4.5m)**
- Unit and integration tests (`bun run test --run`): **16 files, 168/168 passed (6.38s)**

## Next
- All requested E2E scenarios (adding, selling, deleting, generating reports) are fully implemented, verified, and passing in real browser tests.
- Ready for production or staging deployment.

## Blockers / Unknowns
- None. System is green across all test layers.
