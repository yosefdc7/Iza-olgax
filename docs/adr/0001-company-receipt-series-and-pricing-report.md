# 1. Multi-Company Receipt Series, DR/SI Tracking, and Base vs Selling Price Reporting

Date: 2026-09-21

## Status
Accepted

## Context
The business operates with dual receipt formats/companies (e.g. `211` and `CHB`), where sales are tracked with physical Delivery Receipt / Sales Invoice (DR / SI) booklet references, and sales reports must compare the catalog standard **Base Price** against the final **Selling Price**, consistent with legacy reporting spreadsheets (`New 211 sales (sept. 2026).xlsx`).

## Decision
1. **Company / Receipt Selection**: Model receipt channels (`211` and `CHB`) using the existing `ReceiptSeries` entity rather than introducing a separate `Company` table, keeping inventory unified across companies.
2. **DR / SI No. Field**: Add an optional `drSiNumber` string field to `Sale` (and POS payment panel) so cashiers can record physical booklet invoice/delivery numbers.
3. **Base Price vs Selling Price**:
   - `SaleItem.price` represents the final **Selling Price**.
   - Add `SaleItem.basePrice` to capture the standard catalog price snapshot at time of checkout.
4. **Daily Sales Ledger & Reports**:
   - Add `DR / SI No.` and `Base Price` columns to both the web Daily Sales Ledger table and CSV export.
   - Display summary totals split by company/series (e.g., `211 Receipts Total` vs `CHB Receipts Total`), alongside total Base Value vs Selling Value.

## Consequences
- Requires schema update (`prisma/schema.prisma`): `Sale.drSiNumber String?` and `SaleItem.basePrice Decimal?`.
- Requires POS checkout payload update (`drSiNumber` in `POST /api/sales`).
- Cashiers can seamlessly select 211 vs CHB, enter DR/SI numbers, and export reports that mirror the structure of `New 211 sales (sept. 2026).xlsx`.
