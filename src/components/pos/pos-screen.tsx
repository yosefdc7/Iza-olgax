"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { useCartStore } from "@/store/cart";
import { formatCurrency, cn } from "@/lib/utils";
import { Minus, Plus, Trash2, ClipboardList, MessageSquarePlus, ShoppingBag, Receipt, Lock } from "lucide-react";
import { ProductSearch } from "./product-search";
import { PaymentPanel } from "./payment-panel";
import { CustomerCapture, type CustomerSummary } from "./customer-capture";
import { HeldOrdersModal } from "./held-orders-modal";
import { VoidItemModal } from "./void-item-modal";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { NumericKeypad } from "@/components/ui/numeric-keypad";
import { ReceiptModal } from "@/components/receipt/receipt-modal";
import { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal";
import { PosLockOverlay } from "./pos-lock-overlay";
import { usePosKeyboardShortcuts } from "@/hooks/use-pos-keyboard-shortcuts";
import { usePosAutoLock } from "@/hooks/use-pos-auto-lock";
import type { ReceiptData, ReceiptSettings } from "@/components/receipt/receipt";

const DEFAULT_TAX_RATE = 0;

const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  name: "My Shop",
  logoUrl: null,
  currency: "$",
  currencyDecimals: 2,
  taxName: "Tax",
  receiptFooter: "Thank you for your business!",
};

export function POSScreen() {
  const t = useTranslations("pos");
  const tp = useTranslations("products");
  const [taxRate] = useState(DEFAULT_TAX_RATE);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [voidTargetId, setVoidTargetId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"search" | "cart">("search");
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [keypad, setKeypad] = useState<{ open: boolean; itemId: string; value: string }>({
    open: false,
    itemId: "",
    value: "1",
  });
  const prevItemsLenRef = useRef(0);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState(0);

  useEffect(() => {
    setIsClient(true);
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.posAutoLockMinutes === "number") {
          setAutoLockMinutes(data.posAutoLockMinutes);
        }
      })
      .catch(() => {});
  }, []);

  const handleLock = useCallback(() => {
    setIsLocked(true);
  }, []);

  usePosAutoLock({
    autoLockMinutes,
    isLocked,
    onLock: handleLock,
  });

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const focusSearch = useCallback(() => {
    const el = document.getElementById("pos-search-input") as HTMLInputElement | null;
    el?.focus();
    el?.select();
  }, []);

  usePosKeyboardShortcuts({
    onFocusSearch: focusSearch,
    onOpenPayment: () => {
      const btn = document.querySelector<HTMLButtonElement>("[data-charge-btn]");
      btn?.focus();
    },
    onHoldOrders: () => setShowHeldOrders(true),
    onLockTerminal: () => setIsLocked(true),
    onShowHelp: () => setShowShortcuts((v) => !v),
    onEscape: () => {
      setShowShortcuts(false);
      setShowHeldOrders(false);
    },
  });

  const {
    items,
    removeItem,
    updateQuantity,
    updateItemNotes,
    subtotal,
    discountValue,
    taxAmount,
    total,
    clearCart,
    amountTendered,
    paymentMethod,
    paymentLines,
    tipAmount,
  } = useCartStore();

  const sub = subtotal();
  const disc = discountValue();
  const tax = taxAmount(taxRate);
  const tot = total(taxRate);
  const change = Math.max(0, (amountTendered ?? 0) - tot);

  // Auto-switch to cart tab on mobile whenever a new item is added
  useEffect(() => {
    if (items.length > prevItemsLenRef.current && items.length > 0) {
      setMobileTab("cart");
    }
    prevItemsLenRef.current = items.length;
  }, [items.length]);

  const [noteOpenFor, setNoteOpenFor] = useState<string | null>(null);

  if (!isClient) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted animate-pulse" />
        <div className="text-muted-foreground text-sm font-medium animate-pulse">Initializing POS...</div>
      </div>
    );
  }

  function handleSaleComplete(saleId: string) {
    const data: ReceiptData = {
      saleId,
      customerName: customer?.name || undefined,
      items: items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        total: i.price * i.quantity,
        notes: i.notes || undefined,
      })),
      subtotal: sub,
      discountAmount: disc,
      taxAmount: tax,
      tipAmount: tipAmount > 0 ? tipAmount : undefined,
      total: tot,
      paymentMethod,
      paymentLines: paymentLines.length > 0 ? paymentLines : undefined,
      amountTendered: amountTendered ?? 0,
      changeDue: change,
      createdAt: new Date(),
    };
    setReceiptData(data);
    clearCart();
    setCustomer(null);
  }

  function handleVoidItem(productId: string) {
    setVoidTargetId(productId);
  }

  function handleVoidConfirm(_reason?: string) {
    if (voidTargetId) removeItem(voidTargetId);
    setVoidTargetId(null);
  }

  const voidTargetItem = items.find((i) => i.productId === voidTargetId);

  return (
    <div className="flex h-full flex-col lg:flex-row bg-background">
      {/* Mobile tab bar with crisp active line */}
      <div className="flex shrink-0 border-b border-border/80 lg:hidden bg-card">
        <button
          onClick={() => setMobileTab("search")}
          className={cn(
            "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px",
            mobileTab === "search"
              ? "text-primary border-primary"
              : "text-muted-foreground border-transparent"
          )}
        >
          {tp("title")}
        </button>
        <button
          onClick={() => setMobileTab("cart")}
          className={cn(
            "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px flex items-center justify-center gap-1.5",
            mobileTab === "cart"
              ? "text-primary border-primary"
              : "text-muted-foreground border-transparent"
          )}
        >
          <span>Cart</span>
          {items.length > 0 && (
            <span className="inline-flex h-4 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {items.length}
            </span>
          )}
        </button>
      </div>

      {/* Left Pane: Product Catalog & Search */}
      <div className={cn("overflow-y-auto p-4 lg:p-5 lg:flex-1 lg:border-r lg:border-border/80", mobileTab === "cart" ? "hidden lg:block" : "flex-1")}>
        <ProductSearch />
      </div>

      {/* Right Pane: Variant A Bordered Ticket Cart */}
      <div className={cn("flex flex-col lg:w-[27rem] lg:flex-none lg:shrink-0 bg-card/60 backdrop-blur-xs", mobileTab === "search" ? "hidden lg:flex" : "flex flex-1")}>
        {/* Cart Toolbar with hairline border */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Cart {items.length > 0 ? `(${items.length})` : ""}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsLocked(true)}
              title="Lock Terminal (F6)"
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Lock</span>
            </button>
            <button
              onClick={() => setShowHeldOrders(true)}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Held</span>
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              title="Keyboard shortcuts (?)"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-xs font-mono font-semibold hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
            >
              ?
            </button>
          </div>
        </div>

        {/* Customer capture bar */}
        <div className="border-b border-border/80 bg-background/50 px-4 py-2.5">
          <CustomerCapture value={customer} onChange={setCustomer} />
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col h-48 items-center justify-center text-muted-foreground text-sm border border-dashed border-border/70 rounded-lg p-6 text-center">
              <Receipt className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="font-medium text-foreground/70">{t("cart_empty")}</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground leading-tight">{item.name}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="h-7 w-7 rounded-md border border-border/80 flex items-center justify-center hover:bg-accent transition-colors active:scale-95"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      {isTouchDevice ? (
                        <button
                          onClick={() => setKeypad({ open: true, itemId: item.productId, value: String(item.quantity) })}
                          className="w-12 h-7 text-center text-xs font-bold font-mono border border-border/80 rounded-md px-1 bg-background hover:bg-accent active:scale-95 transition-all"
                          aria-label="Quantity — tap to edit"
                        >
                          {item.quantity}
                        </button>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0) updateQuantity(item.productId, val);
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-12 h-7 text-center text-xs font-bold font-mono border border-border/80 rounded-md px-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          aria-label="Quantity"
                        />
                      )}
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="h-7 w-7 rounded-md border border-border/80 flex items-center justify-center hover:bg-accent transition-colors active:scale-95"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <span className="text-sm font-bold font-mono text-foreground w-16 text-right">
                      {formatCurrency(item.price * item.quantity)}
                    </span>

                    {/* Note toggle */}
                    <button
                      onClick={() => setNoteOpenFor(noteOpenFor === item.productId ? null : item.productId)}
                      className={cn(
                        "p-1 rounded-md transition-colors",
                        item.notes ? "text-primary bg-primary/10" : "text-muted-foreground/60 hover:text-foreground"
                      )}
                      aria-label="Add note"
                      title="Item note"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                    </button>

                    {/* Void item */}
                    <button
                      onClick={() => handleVoidItem(item.productId)}
                      className="p-1 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Inline notes */}
                  {noteOpenFor === item.productId && (
                    <div className="px-3 pb-2.5 pt-0 border-t border-border/40">
                      <input
                        autoFocus
                        type="text"
                        value={item.notes || ""}
                        onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                        placeholder="Add note..."
                        className="w-full rounded-md border border-border px-2.5 py-1 text-xs bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary mt-2"
                        onKeyDown={(e) => e.key === "Enter" && setNoteOpenFor(null)}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Order Summary with crisp hairline lines */}
        <div className="border-t border-border/80 bg-muted/20 p-4 space-y-1.5 text-xs font-medium">
          <div className="flex justify-between text-muted-foreground">
            <span>{t("subtotal")}</span>
            <span className="font-mono">{formatCurrency(sub)}</span>
          </div>

          {disc > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>{t("discount")}</span>
              <span className="font-mono">−{formatCurrency(disc)}</span>
            </div>
          )}

          {tax > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>{t("tax")}</span>
              <span className="font-mono">{formatCurrency(tax)}</span>
            </div>
          )}

          {tipAmount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>{t("tip")}</span>
              <span className="font-mono">{formatCurrency(tipAmount)}</span>
            </div>
          )}

          {/* Grand Total Bar */}
          <div className="flex justify-between items-baseline border-t border-border/80 pt-2.5 mt-1 text-sm font-bold text-foreground">
            <span className="uppercase tracking-wider text-xs">{t("total")}</span>
            <span className="text-xl font-mono text-primary font-extrabold">{formatCurrency(tot)}</span>
          </div>
        </div>

        {/* Payment Panel */}
        <PaymentPanel
          taxRate={taxRate}
          onClear={() => {
            if (items.length > 0) setConfirmClear(true);
          }}
          onSaleComplete={handleSaleComplete}
          onHoldOrders={() => setShowHeldOrders(true)}
          customerId={customer?.id}
        />
      </div>

      {/* Held orders modal */}
      <HeldOrdersModal
        open={showHeldOrders}
        onClose={() => setShowHeldOrders(false)}
      />

      {/* Void item modal */}
      <VoidItemModal
        open={!!voidTargetId}
        itemName={voidTargetItem?.name ?? ""}
        onConfirm={handleVoidConfirm}
        onCancel={() => setVoidTargetId(null)}
      />

      {/* Receipt modal */}
      {receiptData && (
        <ReceiptModal
          open={true}
          onClose={() => setReceiptData(null)}
          data={receiptData}
          settings={DEFAULT_RECEIPT_SETTINGS}
        />
      )}

      {/* Clear cart confirmation */}
      <AlertDialog
        open={confirmClear}
        title="Clear order ticket?"
        description="This will remove all items from the current order."
        confirmLabel="Clear Ticket"
        cancelLabel="Keep Items"
        variant="destructive"
        onConfirm={() => { clearCart(); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
      />

      {/* Numeric keypad for touch devices */}
      <NumericKeypad
        open={keypad.open}
        value={keypad.value}
        label={items.find((i) => i.productId === keypad.itemId)?.name}
        onValueChange={(v) => setKeypad((k) => ({ ...k, value: v }))}
        onConfirm={() => {
          const val = parseFloat(keypad.value);
          if (!isNaN(val) && val > 0) updateQuantity(keypad.itemId, val);
          setKeypad({ open: false, itemId: "", value: "1" });
        }}
        onCancel={() => setKeypad({ open: false, itemId: "", value: "1" })}
      />

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}

      {/* POS Lock Screen Overlay */}
      <PosLockOverlay
        isOpen={isLocked}
        onUnlock={() => setIsLocked(false)}
      />
    </div>
  );
}
