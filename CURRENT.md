# CURRENT.md

## Objective
Implement company receipt series selection (211 vs CHB), physical DR/SI booklet reference tracking, catalog Base Price vs Selling Price capture, and structured reporting matching `New 211 sales (sept. 2026).xlsx`.

## Status
**Implementation complete. All 132 tests passing across 11 test files (0 failures, 0 regressions).**

## Completed
- [x] Initialized and updated domain glossary in `CONTEXT.md` (Receipt Series, Base Price, Selling Price, DR / SI No.)
- [x] Recorded ADR in `docs/adr/0001-company-receipt-series-and-pricing-report.md`
- [x] **TDD RED**: Wrote failing unit tests in `src/tests/daily-ledger-pricing.test.ts` for company breakdown totals (`211` & `CHB`), base vs selling values, and CSV formatting matching Excel structure
- [x] **TDD GREEN**: Implemented `calculateLedgerTotals` and `formatLedgerCsvRows` in `src/lib/daily-ledger.ts`
- [x] Verified tests pass: `src/tests/daily-ledger-pricing.test.ts`
- [x] **Prisma schema**: Added `drSiNumber String?` to `Sale` and `basePrice Decimal?` to `SaleItem`
- [x] Regenerated Prisma client via `bun prisma generate`
- [x] **Sales API**: Updated `POST /api/sales` to accept `drSiNumber`, snapshot catalog `basePrice` per line, and store on `Sale` and `SaleItem`
- [x] **POS Payment Panel**: Added `drSiNumber` state, payload submission, reset on sale completion, and DR/SI input field alongside receipt series selection
- [x] **Daily Sales Ledger API**: Updated `GET /api/reports/daily-ledger` to select `drSiNumber` and `basePrice`, compute company breakdown totals (211 & CHB), and export matching CSV format
- [x] **Daily Sales Ledger UI**: Updated `src/components/reports/daily-sales-ledger.tsx` with summary cards (211 Receipts, CHB Receipts, Total Base Value, Total Selling Value) and table columns (DR/SI No., Base Price, Selling Price)
- [x] Full test suite verification: `bun run test --run` → **11 test files, 132 tests, 0 failures**

## Important Decisions
- **Company selection via ReceiptSeries**: `211` and `CHB` are configured as receipt series in Settings, enabling unified product catalog and inventory while issuing separate numbered receipts.
- **DR / SI No.**: Optional physical booklet reference captured at checkout on `Sale.drSiNumber`.
- **Base Price snapshot**: Recorded on `SaleItem.basePrice` from `Product.price` at time of sale so reports accurately contrast standard base price against actual negotiated selling price.

## Changed Files
| File | Change |
|---|---|
| `CONTEXT.md` | NEW — Domain glossary |
| `docs/adr/0001-company-receipt-series-and-pricing-report.md` | NEW — Architecture Decision Record |
| `src/tests/daily-ledger-pricing.test.ts` | NEW — Unit tests for company totals and CSV formatting |
| `src/lib/daily-ledger.ts` | MODIFIED — Added `calculateLedgerTotals`, `formatLedgerCsvRows`, and ledger types |
| `prisma/schema.prisma` | MODIFIED — Added `drSiNumber` on `Sale` and `basePrice` on `SaleItem` |
| `src/app/api/sales/route.ts` | MODIFIED — Added `drSiNumber` and `basePrice` capture |
| `src/components/pos/payment-panel.tsx` | MODIFIED — Added DR/SI input and payload handling |
| `src/app/api/reports/daily-ledger/route.ts` | MODIFIED — Include `drSiNumber`, `basePrice`, series totals, and CSV export |
| `src/components/reports/daily-sales-ledger.tsx` | MODIFIED — Added 211/CHB summary cards, DR/SI badge, and Base Price column |

## Verification
- `bun run test --run` → **11 test files, 132 tests passed (0 failures)** (verified 2026-09-23)
- `src/tests/daily-ledger-pricing.test.ts` passed (2/2 tests)

## Next
1. Apply database migration (`bun prisma db push` or `bun prisma migrate dev`) when connected to the target database
2. Verify visual layout in browser at `/pos` and `/reports`
