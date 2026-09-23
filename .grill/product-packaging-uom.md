# Grill: Product Packaging & Unit of Measure Conversion
Date: 2026-09-21

## Intent
Enable selling products in multiple packaging sizes (e.g., individual nails at ₱5 or a box of 100 nails at ₱300) from a single inventory pool tracked in base units, with auto-adjustment of stock. Designed for a hardware store use case where bulk-to-piece conversion is a daily workflow.

## Constraints
- Must be backward-compatible — existing products without packaging continue to work exactly as today (zero migration risk).
- One packaging level only (Box → Piece); multi-level (Case > Box > Piece) is explicitly deferred.
- Single inventory pool — stock always stored in base units. No dual-tracking of sealed boxes vs. loose pieces.
- Must block sales when stock is insufficient for the requested packaging (e.g., can't sell a box of 100 when only 98 pieces in stock).
- Refunds on packaged sales must use the price the customer actually paid (box per-unit price), not the individual piece price.

## Key decisions
- **Decision:** Atomic Base Unit pattern — inventory always tracked in smallest indivisible unit (pieces). Reason: eliminates fractional/rounding ghost inventory, simplest mental model. Alternative considered: dual inventory with break-bulk transfers (rejected — too complex, adds operational overhead).
- **Decision:** Independent pricing per packaging — box price is NOT auto-calculated from piece price × quantity. Reason: bulk discounts are a real business requirement. Alternative considered: auto-calculated box price (rejected — doesn't reflect real-world pricing).
- **Decision:** `ProductPackaging` table (one-to-many from Product) rather than inline `packSize` field on Product. Reason: naturally supports multiple packaging options per product without schema migration. Alternative considered: adding `packSize` and `packPrice` columns to Product model (rejected — forces migration to add a second packaging type later).
- **Decision:** POS UX is barcode-driven + manual toggle. Scanning a packaging barcode auto-selects that packaging. Name search defaults to base unit with a packaging selector available. Reason: fastest checkout flow for both scenarios.
- **Decision:** Cart and receipt show packaging with base-unit hint: "1 × Box of Nails (100 pcs) — ₱300". Reason: clarity for both cashier and customer.
- **Decision:** Product detail page shows "Stock: 423 pcs (4 Boxes + 23 pcs)"; POS and product list show base units only. Reason: detail page needs the full picture, POS needs speed.
- **Decision:** Compound input for stock adjustments: "[4] Boxes + [23] Pieces = 423 base units". Reason: staff can't practically count thousands of loose items.

## Surfaced assumptions
- The `unit` field on Product is currently a free-form display label ("pc", "kg", "bag") — it serves as the base unit name but has no conversion semantics. This feature gives it meaning.
- Existing `quantityPrecision` (0–4 decimals) will interact with packaging — base unit precision stays as-is; packaging quantities are always whole numbers.
- The `SaleItem` model currently doesn't record packaging info — it will need a `packagingId` or equivalent to support correct refund calculations.

## Open questions
- Should the packaging barcode search also work in offline/PGLite mode, or is it acceptable to require online mode for barcode-to-packaging resolution?
- Weight-based UoM conversion (e.g., selling 500g from a 25kg sack) was not excluded from scope but wasn't explicitly included — defer to a separate feature or handle as a special case of packaging?

## Out of scope
- Multi-level packaging (Case > Box > Piece) — one level is enough for now.
- Dual inventory tracking (sealed boxes vs. loose pieces as separate stock balances).
- Automatic break-bulk triggers (auto-unpack a box when loose stock hits zero).
- Purchase order / supplier ordering integration with packaging quantities.
