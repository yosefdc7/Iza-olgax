"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Printer,
  ShoppingCart,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Store,
  RotateCcw,
  CheckCircle2,
  Coffee,
  ShoppingBag,
  Utensils,
  Receipt,
  Zap,
  Lock,
  ArrowRight,
  HelpCircle,
  BookOpen,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetupStatus {
  envOk: boolean;
  dbConnected: boolean;
  dbInitialized: boolean;
  hasAdmin: boolean;
  setupComplete: boolean;
  missingEnv: string[];
  dbError?: string;
}

export interface BusinessPreset {
  id: string;
  name: string;
  label: string;
  tagline: string;
  icon: string;
  currency: string;
  currencyDecimals: string;
  taxRate: string;
  taxName: string;
  receiptFooter: string;
}

export const BUSINESS_PRESETS: BusinessPreset[] = [
  {
    id: "cafe",
    name: "Artisan Cafe & Bakery",
    label: "Cafe & Coffee Shop",
    tagline: "Quick beverage, bakery counter, and fast-paced orders",
    icon: "☕",
    currency: "$",
    currencyDecimals: "2",
    taxRate: "8.25",
    taxName: "Sales Tax",
    receiptFooter: "Roasted with love! Thank you for visiting.",
  },
  {
    id: "retail",
    name: "Luxe Boutique & Apparel",
    label: "Retail & Boutique",
    tagline: "Clothing, accessories, barcode tags, and inventory audit",
    icon: "🛍️",
    currency: "$",
    currencyDecimals: "2",
    taxRate: "7.00",
    taxName: "State Tax",
    receiptFooter: "Exchanges welcome within 14 days with receipt.",
  },
  {
    id: "grocery",
    name: "Neighborhood Bodega & Market",
    label: "Grocery & Mini-Mart",
    tagline: "High transaction volume, rapid barcode scans, food tax exemption",
    icon: "🛒",
    currency: "$",
    currencyDecimals: "2",
    taxRate: "0.00",
    taxName: "Tax Exempt",
    receiptFooter: "Thank you for supporting your local grocery store!",
  },
  {
    id: "restaurant",
    name: "Urban Bites & Diner",
    label: "Restaurant & Quick Eats",
    tagline: "Table orders, kitchen tickets, split payments, and gratuity",
    icon: "🍕",
    currency: "$",
    currencyDecimals: "2",
    taxRate: "10.00",
    taxName: "VAT",
    receiptFooter: "Cooked fresh to order. Please come again soon!",
  },
  {
    id: "custom",
    name: "My Retail Store",
    label: "General / Custom Store",
    tagline: "Standard retail counter customized to your business",
    icon: "🏪",
    currency: "$",
    currencyDecimals: "2",
    taxRate: "0.00",
    taxName: "Tax",
    receiptFooter: "Thank you for your purchase!",
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = [
  "Interactive Tutorial",
  "System Check",
  "Database",
  "Admin Account",
  "Business Info",
  "Done!",
];

// ─── Small helpers ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          ok ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"
        }`}
      >
        {ok ? "✓" : "✗"}
      </span>
      <span className={`text-sm ${ok ? "text-gray-700" : "text-red-500"}`}>{label}</span>
    </div>
  );
}

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative mt-2 rounded-lg bg-gray-900 border border-gray-700">
      <pre className="p-3 pr-16 text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap break-all">
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute right-2 top-2 px-2 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 rounded-lg border border-gray-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <span>{title}</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-4 pb-4 text-sm text-gray-600 border-t border-gray-100">{children}</div>}
    </div>
  );
}

function StepCard({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className={`w-full ${
        wide ? "max-w-2xl" : "max-w-lg"
      } rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/80 overflow-hidden transition-all duration-300`}
    >
      {children}
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({
  step,
  total,
  wide = false,
}: {
  step: number;
  total: number;
  wide?: boolean;
}) {
  const pct = Math.round((step / (total - 1)) * 100);
  return (
    <div className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} mb-4 transition-all duration-300`}>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>
          Step {step + 1} of {total}
        </span>
        <span className="font-medium text-[#0f2044]">{STEP_LABELS[step]}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200">
        <div
          className="h-1.5 rounded-full bg-[#f5c518] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Step 0 — Interactive True Tutorial ────────────────────────────────────────

const TUTORIAL_CHAPTERS = [
  { id: "arch", title: "Architecture & Offline", icon: Wifi, badge: "Pillar 1" },
  { id: "register", title: "Live Register Demo", icon: ShoppingCart, badge: "Pillar 2" },
  { id: "security", title: "Staff PIN & Roles", icon: Lock, badge: "Pillar 3" },
  { id: "hardware", title: "Thermal Hardware", icon: Printer, badge: "Pillar 4" },
  { id: "presets", title: "Store Presets", icon: Store, badge: "Pillar 5" },
];

function TutorialStepWelcome({
  onNext,
}: {
  onNext: (preset?: BusinessPreset) => void;
}) {
  const [activeChapter, setActiveChapter] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<BusinessPreset>(BUSINESS_PRESETS[0]);

  // Chapter 1: Offline simulator state
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<
    Array<{ id: number; item: string; amount: number }>
  >([]);
  const [syncStatus, setSyncStatus] = useState<string>("Synced with Cloud Database");

  const toggleOffline = () => {
    if (!isSimulatedOffline) {
      setIsSimulatedOffline(true);
      setSyncStatus("Offline Mode Active — Orders queue locally in IndexedDB");
    } else {
      setIsSimulatedOffline(false);
      setSyncStatus("Reconnecting... All pending sales synced to Cloud PostgreSQL ✓");
      setTimeout(() => {
        setOfflineQueue([]);
        setSyncStatus("Online & Synchronized with Cloud Database");
      }, 1600);
    }
  };

  const addOfflineSample = () => {
    const newSale = {
      id: Date.now(),
      item: "Table #3 Lunch Combo",
      amount: 14.5,
    };
    setOfflineQueue((prev) => [...prev, newSale]);
  };

  // Chapter 2: Interactive Cashier Terminal Simulator state
  const sampleCatalog = [
    { id: "cb", name: "Cold Brew Coffee", price: 4.0, icon: "☕" },
    { id: "cr", name: "Butter Croissant", price: 3.25, icon: "🥐" },
    { id: "pn", name: "Artisan Panini", price: 7.5, icon: "🥪" },
    { id: "oj", name: "Cold Pressed Juice", price: 3.75, icon: "🧃" },
  ];

  const [cart, setCart] = useState<{ [id: string]: number }>({ cb: 1, cr: 1 });
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) => {
      const nextQty = (prev[id] || 0) + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: nextQty };
    });
  };

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const item = sampleCatalog.find((p) => p.id === id)!;
    return { ...item, qty, total: item.price * qty };
  });

  const cartSubtotal = cartItems.reduce((acc, it) => acc + it.total, 0);
  const cartTax = cartSubtotal * 0.08;
  const cartTotal = cartSubtotal + cartTax;

  // Chapter 3: Interactive 4-Digit PIN State
  const [enteredPin, setEnteredPin] = useState("");
  const [pinSuccess, setPinSuccess] = useState(false);

  const handlePinDigit = (digit: string) => {
    if (enteredPin.length < 4) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      if (next.length === 4) {
        setPinSuccess(true);
      }
    }
  };

  const clearPin = () => {
    setEnteredPin("");
    setPinSuccess(false);
  };

  // Chapter 4: Hardware & Thermal Slip width
  const [paperWidth, setPaperWidth] = useState<"58" | "80">("80");
  const [seriesPrefix, setSeriesPrefix] = useState("INV-");

  return (
    <StepCard wide>
      <div className="p-6 md:p-8">
        {/* Header with Title and Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                True Interactive Tutorial
              </span>
              <span className="text-xs text-gray-400">
                Pillar {activeChapter + 1} of {TUTORIAL_CHAPTERS.length}
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#0f2044] tracking-tight">
              Welcome to Izah POS
            </h1>
            <p className="text-xs text-gray-500">
              Interactive hands-on walkthrough. Master the system before configuring your store.
            </p>
          </div>

          <button
            onClick={() => onNext(selectedPreset)}
            className="self-start sm:self-auto text-xs font-semibold text-gray-500 hover:text-[#0f2044] bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            Skip to Setup <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Chapter Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 my-5 bg-gray-50 p-1.5 rounded-2xl border border-gray-200/60">
          {TUTORIAL_CHAPTERS.map((ch, idx) => {
            const Icon = ch.icon;
            const isActive = activeChapter === idx;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChapter(idx)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-white text-[#0f2044] font-bold shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-800 hover:bg-white/50"
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isActive ? "text-[#f5c518]" : "text-gray-400"}`} />
                <span className="truncate w-full text-center">{ch.title}</span>
              </button>
            );
          })}
        </div>

        {/* ── CHAPTER 0: Architecture & Offline-First ──────────────────────── */}
        {activeChapter === 0 && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 rounded-2xl p-4 border border-blue-100">
              <h2 className="text-base font-bold text-[#0f2044] flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-600" />
                Offline-First Reliability: Never Stop Ringing Sales
              </h2>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Most POS terminals crash when store Wi-Fi hiccups. Izah POS operates with an
                active local <strong>IndexedDB engine</strong> inside the browser. Orders process in
                &lt;50ms locally, and synchronize seamlessly to your Cloud PostgreSQL database the
                moment connectivity returns.
              </p>
            </div>

            {/* Interactive Offline Simulator Sandbox */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isSimulatedOffline
                        ? "bg-amber-500 animate-pulse"
                        : "bg-emerald-500"
                    }`}
                  />
                  <span className="text-xs font-bold text-gray-800">
                    Simulator Status:{" "}
                    <span className={isSimulatedOffline ? "text-amber-600" : "text-emerald-600"}>
                      {isSimulatedOffline ? "Offline Mode (Simulated)" : "Online Connected"}
                    </span>
                  </span>
                </div>

                <button
                  onClick={toggleOffline}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSimulatedOffline
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      : "bg-amber-100 hover:bg-amber-200 text-amber-900"
                  }`}
                >
                  {isSimulatedOffline ? (
                    <>
                      <Wifi className="w-3.5 h-3.5" /> Reconnect Wi-Fi
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5" /> Simulate Wi-Fi Drop
                    </>
                  )}
                </button>
              </div>

              {/* Diagram / Status Box */}
              <div className="my-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    1. POS Screen
                  </div>
                  <div className="text-sm font-bold text-[#0f2044]">Instant Response</div>
                  <div className="text-[11px] text-gray-500">Zero wait for network</div>
                </div>
                <div
                  className={`p-3 rounded-xl border transition-colors ${
                    isSimulatedOffline
                      ? "bg-amber-50 border-amber-300 text-amber-900"
                      : "bg-emerald-50 border-emerald-200 text-emerald-900"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1">
                    2. Local IndexedDB
                  </div>
                  <div className="text-sm font-bold">
                    {offlineQueue.length} Queued Sales
                  </div>
                  <div className="text-[11px]">Always active & safe</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    3. Cloud DB Sync
                  </div>
                  <div className="text-sm font-bold text-[#0f2044]">PostgreSQL</div>
                  <div className="text-[11px] text-gray-500">
                    {isSimulatedOffline ? "Awaiting connection" : "Auto-synced"}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl">
                <p className="text-xs text-gray-600 font-medium">
                  {syncStatus}
                </p>
                {isSimulatedOffline && (
                  <button
                    onClick={addOfflineSample}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-[#0f2044] text-white text-xs font-bold hover:bg-[#1a356e] transition-colors"
                  >
                    + Ring Up Offline Sale ($14.50)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── CHAPTER 1: Live Register Simulator ──────────────────────────── */}
        {activeChapter === 1 && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-50/70 to-yellow-50/70 rounded-2xl p-4 border border-amber-200/60">
              <h2 className="text-base font-bold text-[#0f2044] flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-amber-600" />
                Hands-On Register: Experience Rapid Cashier Checkout
              </h2>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Test the POS terminal right here. Tap products to build an order, adjust
                quantities, calculate real-time taxes, and complete a simulated sale to generate
                a live customer receipt.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Product Catalog Grid */}
              <div className="md:col-span-7 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Click to Add Products
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {sampleCatalog.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => addToCart(prod.id)}
                      className="p-3 rounded-xl border border-gray-200 bg-white hover:border-[#f5c518] hover:shadow-sm text-left transition-all group"
                    >
                      <div className="text-2xl mb-1">{prod.icon}</div>
                      <div className="text-xs font-bold text-[#0f2044] group-hover:text-amber-600 transition-colors truncate">
                        {prod.name}
                      </div>
                      <div className="text-xs font-semibold text-gray-500">
                        ${prod.price.toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Cart Ticket */}
              <div className="md:col-span-5 rounded-2xl border border-gray-200 bg-gray-50/70 p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="text-xs font-bold text-gray-700">Current Order</span>
                    <button
                      onClick={() => setCart({})}
                      className="text-[11px] text-gray-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="space-y-1.5 my-2 max-h-36 overflow-y-auto pr-1">
                    {cartItems.length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-400">
                        Cart is empty. Tap products to add.
                      </div>
                    ) : (
                      cartItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs py-1 border-b border-gray-100"
                        >
                          <div className="truncate pr-1">
                            <span className="font-semibold text-gray-800">{item.name}</span>
                            <span className="text-gray-400 ml-1">x{item.qty}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="font-mono text-gray-700">
                              ${item.total.toFixed(2)}
                            </span>
                            <div className="flex items-center border border-gray-200 rounded bg-white">
                              <button
                                onClick={() => updateCartQty(item.id, -1)}
                                className="px-1 text-gray-500 hover:bg-gray-100"
                              >
                                -
                              </button>
                              <button
                                onClick={() => updateCartQty(item.id, 1)}
                                className="px-1 text-gray-500 hover:bg-gray-100"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-mono">${cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Tax (8%)</span>
                    <span className="font-mono">${cartTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#0f2044]">
                    <span>Total</span>
                    <span className="font-mono">${cartTotal.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={() => setShowReceiptModal(true)}
                    disabled={cartItems.length === 0}
                    className="w-full mt-2 py-2 rounded-xl bg-[#f5c518] hover:bg-yellow-400 text-[#0f2044] font-bold text-xs transition-colors disabled:opacity-40 shadow-sm"
                  >
                    Complete Sale & Print Receipt →
                  </button>
                </div>
              </div>
            </div>

            {/* Simulated Printed Thermal Slip */}
            {showReceiptModal && (
              <div className="p-4 rounded-2xl bg-gray-900 text-white animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800 mb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">
                      Simulated Thermal Receipt Output
                    </span>
                  </div>
                  <button
                    onClick={() => setShowReceiptModal(false)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Close Slip ✕
                  </button>
                </div>

                <div className="max-w-xs mx-auto bg-white text-gray-900 p-4 rounded-xl font-mono text-[11px] shadow-lg border-dashed border-2 border-gray-300">
                  <div className="text-center font-bold text-xs mb-1">IZAH RETAIL STORE</div>
                  <div className="text-center text-gray-500 mb-2">Order #REC-2026-0001</div>
                  <div className="border-b border-gray-300 pb-1 mb-2">
                    {cartItems.map((it) => (
                      <div key={it.id} className="flex justify-between">
                        <span>
                          {it.name} x{it.qty}
                        </span>
                        <span>${it.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (8%):</span>
                    <span>${cartTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs my-1">
                    <span>TOTAL PAID:</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-center text-gray-400 mt-3 pt-2 border-t border-gray-200">
                    *** Thank you for shopping! ***
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CHAPTER 2: Staff PIN & Roles ────────────────────────────────── */}
        {activeChapter === 2 && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-emerald-50/70 to-teal-50/70 rounded-2xl p-4 border border-emerald-100">
              <h2 className="text-base font-bold text-[#0f2044] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Staff Roles & Instant 4-Digit Terminal PIN
              </h2>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                During busy rushes, multiple team members share the register. Izah POS provides
                fast 4-digit numeric PINs for 1-second terminal unlocking and cashier switching
                without requiring cumbersome email logins.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              {/* Interactive Keypad */}
              <div className="sm:col-span-6 bg-gray-50 p-4 rounded-2xl border border-gray-200/80 max-w-xs mx-auto w-full">
                <div className="text-center mb-3">
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                    Tap 4-Digit PIN Demo
                  </div>
                  <div className="flex justify-center gap-2 my-2">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                          enteredPin.length > idx
                            ? "bg-[#0f2044] border-[#0f2044] scale-110"
                            : "bg-white border-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  {pinSuccess && (
                    <div className="text-xs text-emerald-600 font-bold animate-in fade-in">
                      ✓ Terminal Unlocked: Sarah (Cashier)
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "✓"].map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        if (k === "C") clearPin();
                        else if (k === "✓") {
                          if (enteredPin.length === 4) setPinSuccess(true);
                        } else handlePinDigit(k);
                      }}
                      className="py-2.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-sm font-bold text-gray-700 active:scale-95 transition-all shadow-sm"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role Permissions Comparison */}
              <div className="sm:col-span-6 space-y-3">
                <div className="p-3.5 rounded-xl border border-gray-200 bg-white">
                  <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Cashier Staff Permissions
                  </div>
                  <ul className="text-xs text-gray-500 space-y-1 pl-3.5 list-disc">
                    <li>Ring up sales and scan barcodes</li>
                    <li>Accept cash, card, and QR payments</li>
                    <li>Print customer & thermal duplicate receipts</li>
                    <li>Locked out of administrative settings</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Store Administrator Permissions
                  </div>
                  <ul className="text-xs text-gray-600 space-y-1 pl-3.5 list-disc">
                    <li>Process refunds and stock adjustments</li>
                    <li>Manage product catalog, prices, and taxes</li>
                    <li>View End-of-Day Z-Reports and CSV Ledgers</li>
                    <li>Manage user PINs and business information</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CHAPTER 3: Hardware & Printing ──────────────────────────────── */}
        {activeChapter === 3 && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-50/70 to-pink-50/70 rounded-2xl p-4 border border-purple-100">
              <h2 className="text-base font-bold text-[#0f2044] flex items-center gap-2">
                <Printer className="w-4 h-4 text-purple-600" />
                Hardware Support: 58mm & 80mm ESC/POS Thermal Printing
              </h2>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Connect directly to receipt printers via WebUSB, WebSerial, Bluetooth, or standard
                browser print. Customize sequential receipt numbering series (e.g.{" "}
                <code>INV-2026-0001</code>) to stay legally compliant.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Paper Format Preview
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaperWidth("58")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      paperWidth === "58"
                        ? "border-[#f5c518] bg-amber-50/50 text-[#0f2044] ring-1 ring-[#f5c518]"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    58mm Compact
                  </button>
                  <button
                    onClick={() => setPaperWidth("80")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      paperWidth === "80"
                        ? "border-[#f5c518] bg-amber-50/50 text-[#0f2044] ring-1 ring-[#f5c518]"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    80mm Standard
                  </button>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Receipt Series Prefix
                  </label>
                  <input
                    type="text"
                    value={seriesPrefix}
                    onChange={(e) => setSeriesPrefix(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono uppercase bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2044]/10"
                    placeholder="INV-"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Generated receipt number:{" "}
                    <strong className="text-gray-700 font-mono">
                      {seriesPrefix}2026-0001
                    </strong>
                  </p>
                </div>
              </div>

              {/* Visual Simulated Slip */}
              <div className="flex items-center justify-center p-4 bg-gray-100 rounded-2xl">
                <div
                  className={`bg-white border-dashed border-2 border-gray-300 p-3 text-[10px] font-mono shadow-md transition-all duration-300 ${
                    paperWidth === "58" ? "w-44" : "w-60"
                  }`}
                >
                  <div className="text-center font-bold">IZAH POS RECEIPT</div>
                  <div className="text-center text-gray-500 text-[9px]">
                    {seriesPrefix}2026-0001
                  </div>
                  <div className="border-t border-b border-gray-200 my-1 py-1">
                    <div className="flex justify-between">
                      <span>Espresso x1</span>
                      <span>$3.50</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Muffin x1</span>
                      <span>$2.75</span>
                    </div>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>TOTAL:</span>
                    <span>$6.25</span>
                  </div>
                  <div className="text-center text-[8px] text-gray-400 mt-2">
                    [|||| ||| ||||| ||||]
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CHAPTER 4: Industry Store Presets ───────────────────────────── */}
        {activeChapter === 4 && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-yellow-50/80 to-amber-50/80 rounded-2xl p-4 border border-yellow-200/80">
              <h2 className="text-base font-bold text-[#0f2044] flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-600" />
                Select Your Industry Preset & Complete Setup
              </h2>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Choose the preset closest to your store. We will automatically prefill your
                recommended currency, tax rates, and receipt templates for Step 4. You can edit
                any field as needed.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BUSINESS_PRESETS.map((p) => {
                const isSelected = selectedPreset.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPreset(p)}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? "border-[#f5c518] bg-amber-50/40 shadow-sm ring-2 ring-[#f5c518]"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-2xl mb-1.5">{p.icon}</div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#f5c518] text-[#0f2044] flex items-center justify-center text-xs font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-[#0f2044]">{p.label}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 mb-2 line-clamp-1">
                      {p.tagline}
                    </div>

                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-gray-600 font-mono">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                        Currency: {p.currency}
                      </span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                        {p.taxName}: {p.taxRate}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 flex items-center justify-between">
              <div>
                Selected Preset:{" "}
                <strong className="text-[#0f2044]">{selectedPreset.name}</strong> ({selectedPreset.currency} / {selectedPreset.taxRate}% {selectedPreset.taxName})
              </div>
              <span className="text-[11px] text-amber-700 font-medium">Ready to Configure</span>
            </div>
          </div>
        )}

        {/* ── Footer Navigation Bar ───────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-6">
          <button
            onClick={() => setActiveChapter((c) => Math.max(0, c - 1))}
            disabled={activeChapter === 0}
            className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:hover:text-gray-400 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Previous Pillar
          </button>

          <div className="flex items-center gap-1.5">
            {TUTORIAL_CHAPTERS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveChapter(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  activeChapter === idx
                    ? "w-6 bg-[#0f2044]"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to chapter ${idx + 1}`}
              />
            ))}
          </div>

          {activeChapter < TUTORIAL_CHAPTERS.length - 1 ? (
            <button
              onClick={() => setActiveChapter((c) => c + 1)}
              className="px-4 py-2 rounded-xl bg-[#0f2044] hover:bg-[#1a356e] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              Next Pillar <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onNext(selectedPreset)}
              className="px-5 py-2.5 rounded-xl bg-[#f5c518] hover:bg-yellow-400 text-[#0f2044] text-xs font-bold transition-all shadow-md shadow-[#f5c518]/30 flex items-center gap-2"
            >
              Apply Preset & Begin System Setup →
            </button>
          )}
        </div>
      </div>
    </StepCard>
  );
}

// ─── Step 1 — System Check ────────────────────────────────────────────────────

function StepSystemCheck({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({
        envOk: false,
        dbConnected: false,
        dbInitialized: false,
        hasAdmin: false,
        setupComplete: false,
        missingEnv: ["DATABASE_URL", "BETTER_AUTH_SECRET"],
        dbError: "Could not connect to the server.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const missingDbUrl = status?.missingEnv.includes("DATABASE_URL");
  const missingSecret = status?.missingEnv.includes("BETTER_AUTH_SECRET");

  return (
    <StepCard>
      <div className="px-6 pt-8 pb-2">
        <h2 className="text-xl font-bold text-[#0f2044] mb-1">System Check</h2>
        <p className="text-sm text-gray-500 mb-6">
          We&apos;ll verify your environment variables are configured correctly.
        </p>

        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-6 justify-center">
            <Spinner /> Checking your configuration…
          </div>
        )}

        {!loading && status && (
          <div className="space-y-1">
            <Check
              ok={!missingDbUrl}
              label={
                missingDbUrl
                  ? "DATABASE_URL — not set (required)"
                  : "DATABASE_URL — configured ✓"
              }
            />
            <Check
              ok={!missingSecret}
              label={
                missingSecret
                  ? "BETTER_AUTH_SECRET — not set (required)"
                  : "BETTER_AUTH_SECRET — configured ✓"
              }
            />
          </div>
        )}

        {!loading && status && !status.envOk && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
              How to fix
            </p>
            <Collapsible title="📄 Create a .env.local file">
              <p className="mt-3 mb-2 text-gray-600">
                Create a file named <code className="text-[#0f2044] font-semibold">.env.local</code> in the root
                of your project with the following content:
              </p>
              <CopyBlock
                code={`DATABASE_URL="postgresql://izah:izah@localhost:5432/izah_pos"
BETTER_AUTH_SECRET="${Array.from(crypto.getRandomValues(new Uint8Array(32)))
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("")}"`}
              />
              <p className="mt-3 text-gray-400 text-xs">
                After saving, restart the dev server with{" "}
                <code className="text-[#0f2044] font-semibold">pnpm dev</code> and click{" "}
                <strong>Check Again</strong>.
              </p>
            </Collapsible>

            <Collapsible title="🐋 Start PostgreSQL with Docker">
              <p className="mt-3 mb-2 text-gray-600">
                If you don&apos;t have PostgreSQL running, start it with Docker:
              </p>
              <CopyBlock code="docker compose up -d postgres" />
              <p className="mt-2 text-gray-600">
                Don&apos;t have Docker? Download it at{" "}
                <a
                  href="https://docker.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0f2044] underline font-medium"
                >
                  docker.com
                </a>
              </p>
            </Collapsible>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-5 border-t border-gray-100 mt-4">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          ← Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={check}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {loading ? <Spinner /> : "Check Again"}
          </button>
          <button
            onClick={onNext}
            disabled={!status?.envOk || loading}
            className="px-5 py-2 rounded-lg bg-[#f5c518] hover:bg-yellow-400 text-[#0f2044] text-sm font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
          >
            Continue →
          </button>
        </div>
      </div>
    </StepCard>
  );
}

// ─── Step 2 — Database ────────────────────────────────────────────────────────

function StepDatabase({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateOutput, setMigrateOutput] = useState("");
  const [migrateError, setMigrateError] = useState("");
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup/status");
      setStatus(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const runMigrations = async () => {
    setMigrating(true);
    setMigrateOutput("");
    setMigrateError("");
    try {
      const res = await fetch("/api/setup/migrate", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMigrateOutput(data.output || "Database initialized successfully.");
        await checkStatus();
      } else {
        setMigrateError(data.error || "Migration failed.");
      }
    } catch {
      setMigrateError("Failed to connect to server.");
    } finally {
      setMigrating(false);
    }
  };

  const canContinue = status?.dbConnected && status?.dbInitialized;

  return (
    <StepCard>
      <div className="px-6 pt-8 pb-2">
        <h2 className="text-xl font-bold text-[#0f2044] mb-1">Database Setup</h2>
        <p className="text-sm text-gray-500 mb-6">
          Connect to your PostgreSQL database and initialize the tables.
        </p>

        {(loading || migrating) && (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-4 justify-center">
            <Spinner /> {migrating ? "Running database setup…" : "Testing connection…"}
          </div>
        )}

        {!loading && status && (
          <div className="space-y-1">
            {status.dbConnected ? (
              <div className="flex items-center gap-3 py-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                <span className="text-sm text-gray-700 font-medium">Database connection — Connected successfully</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-bold">✗</span>
                <span className="text-sm text-red-500 font-medium">Database connection — Failed to connect</span>
              </div>
            )}

            {status.dbConnected && (
              status.dbInitialized ? (
                <div className="flex items-center gap-3 py-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                  <span className="text-sm text-gray-700 font-medium">Database tables — Schema is up to date</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">!</span>
                  <span className="text-sm text-amber-600 font-medium">Database tables — Ready to be initialized</span>
                </div>
              )
            )}
          </div>
        )}

        {!loading && status?.dbError && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-xs font-semibold text-red-600 mb-1">Connection error</p>
            <p className="text-xs text-red-500 font-mono">{status.dbError}</p>
          </div>
        )}

        {migrateOutput && (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-xs text-emerald-700 font-mono whitespace-pre-wrap">{migrateOutput}</p>
          </div>
        )}

        {migrateError && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-xs font-semibold text-red-600 mb-1">Error</p>
            <p className="text-xs text-red-500 font-mono whitespace-pre-wrap">{migrateError}</p>
          </div>
        )}

        {!loading && status && !status.dbConnected && (
          <Collapsible title="🐋 How to start PostgreSQL">
            <p className="mt-3 mb-2 text-gray-600">Run this command to start the database:</p>
            <CopyBlock code="docker compose up -d postgres" />
            <p className="mt-2 text-gray-400 text-xs">
              Then click <strong>Test Connection</strong> again.
            </p>
          </Collapsible>
        )}

        {!loading && status?.dbConnected && !status.dbInitialized && !migrateOutput && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Ready to initialize!</strong> Click the button below to create all required
              database tables. This takes about 5–10 seconds.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-5 border-t border-gray-100 mt-4">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          ← Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={checkStatus}
            disabled={loading || migrating}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Test Connection
          </button>
          {status?.dbConnected && !status.dbInitialized && (
            <button
              onClick={runMigrations}
              disabled={migrating}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold transition-colors disabled:opacity-40"
            >
              {migrating ? <Spinner /> : "Initialize DB"}
            </button>
          )}
          <button
            onClick={onNext}
            disabled={!canContinue}
            className="px-5 py-2 rounded-lg bg-[#f5c518] hover:bg-yellow-400 text-[#0f2044] text-sm font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
          >
            Continue →
          </button>
        </div>
      </div>
    </StepCard>
  );
}

// ─── Step 3 — Admin Account ───────────────────────────────────────────────────

function StepAdminAccount({
  onNext,
  onBack,
  setAdminEmail,
}: {
  onNext: () => void;
  onBack: () => void;
  setAdminEmail: (e: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pin, setPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validate = () => {
    if (name.trim().length < 2) return "Name must be at least 2 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
    if (password.length < 4) return "Password must be at least 4 characters.";
    if (password !== confirm) return "Passwords do not match.";
    if (pin.trim() && !/^\d{4}$/.test(pin.trim())) return "PIN must be exactly 4 numeric digits.";
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/setup/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          pin: pin.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAdminEmail(data.email);
        onNext();
      } else {
        setError(typeof data.error === "string" ? data.error : "Failed to create account.");
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "flex h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-[#0f2044] focus:bg-white focus:ring-2 focus:ring-[#0f2044]/10";

  return (
    <StepCard>
      <form onSubmit={submit}>
        <div className="px-6 pt-8 pb-2">
          <h2 className="text-xl font-bold text-[#0f2044] mb-1">Create Admin Account</h2>
          <p className="text-sm text-gray-500 mb-6">
            This account will have full access to all settings and reports.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                autoComplete="name"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@mystore.com"
                autoComplete="email"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  autoComplete="new-password"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                4-Digit POS Quick PIN (Optional)
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="e.g. 1234"
                className={`${inputClass} font-mono tracking-widest`}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Used for fast POS terminal unlock and cashier switching.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-5 border-t border-gray-100 mt-4">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-[#f5c518] hover:bg-yellow-400 text-[#0f2044] text-sm font-bold transition-colors disabled:opacity-40 flex items-center gap-2 shadow-sm"
          >
            {loading && <Spinner />} Create Account →
          </button>
        </div>
      </form>
    </StepCard>
  );
}

// ─── Step 4 — Business Settings ───────────────────────────────────────────────

function StepBusinessSettings({
  onNext,
  onBack,
  preset,
}: {
  onNext: () => void;
  onBack: () => void;
  preset: BusinessPreset | null;
}) {
  const [businessName, setBusinessName] = useState(preset?.name || "");
  const [currency, setCurrency] = useState(preset?.currency || "$");
  const [currencyDecimals, setCurrencyDecimals] = useState(preset?.currencyDecimals || "2");
  const [taxRate, setTaxRate] = useState(preset?.taxRate || "0");
  const [taxName, setTaxName] = useState(preset?.taxName || "Tax");
  const [receiptFooter, setReceiptFooter] = useState(
    preset?.receiptFooter || "Thank you for your purchase!"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const applyQuickPreset = (p: BusinessPreset) => {
    setBusinessName(p.name);
    setCurrency(p.currency);
    setCurrencyDecimals(p.currencyDecimals);
    setTaxRate(p.taxRate);
    setTaxName(p.taxName);
    setReceiptFooter(p.receiptFooter);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError("Business name is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          currency,
          currencyDecimals: Number(currencyDecimals),
          taxRate: Number(taxRate),
          taxName,
          receiptFooter,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        onNext();
      } else {
        setError(typeof data.error === "string" ? data.error : "Failed to save settings.");
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "flex h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-[#0f2044] focus:bg-white focus:ring-2 focus:ring-[#0f2044]/10";

  const numDecimals = Number(currencyDecimals) || 2;
  const sampleSubtotal = 24.5;
  const calculatedTax = sampleSubtotal * ((Number(taxRate) || 0) / 100);
  const sampleTotal = sampleSubtotal + calculatedTax;

  return (
    <StepCard wide>
      <form onSubmit={submit}>
        <div className="p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-xl font-black text-[#0f2044] tracking-tight">
                Business & Receipt Branding
              </h2>
              <p className="text-xs text-gray-500">
                Configure your store name, tax rates, and customer receipt layout.
              </p>
            </div>
            {preset && (
              <span className="self-start sm:self-auto text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold flex items-center gap-1">
                <span>{preset.icon}</span> Using {preset.label} Preset
              </span>
            )}
          </div>

          {/* Quick preset selector buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap mr-1">
              Presets:
            </span>
            {BUSINESS_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyQuickPreset(p)}
                className="px-2.5 py-1 rounded-lg border border-gray-200 hover:border-amber-400 bg-gray-50 hover:bg-white text-xs text-gray-600 transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Form Column */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Business / Store Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Artisan Cafe & Roastery"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    maxLength={5}
                    placeholder="$"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Decimal Places
                  </label>
                  <select
                    value={currencyDecimals}
                    onChange={(e) => setCurrencyDecimals(e.target.value)}
                    className={inputClass}
                  >
                    <option value="0">0 (e.g. ¥100)</option>
                    <option value="2">2 (e.g. $9.99)</option>
                    <option value="3">3 (e.g. 1.250 KD)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Tax Label
                  </label>
                  <input
                    type="text"
                    value={taxName}
                    onChange={(e) => setTaxName(e.target.value)}
                    placeholder="VAT / Sales Tax"
                    maxLength={30}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Receipt Footer Message
                </label>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  maxLength={200}
                  placeholder="Thank you for visiting!"
                  className={inputClass}
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}
            </div>

            {/* Live Receipt Preview Column */}
            <div className="md:col-span-5 bg-gray-100 p-4 rounded-2xl border border-gray-200/80 flex flex-col items-center">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-gray-400" />
                Live Customer Receipt Preview
              </div>

              <div className="w-full max-w-[240px] bg-white border-dashed border-2 border-gray-300 p-3.5 rounded-xl font-mono text-[10px] text-gray-900 shadow-sm leading-relaxed">
                <div className="text-center font-bold text-xs uppercase tracking-wide truncate">
                  {businessName.trim() || "STORE NAME"}
                </div>
                <div className="text-center text-gray-400 text-[9px] mb-2">
                  Invoice #INV-2026-0001
                </div>

                <div className="border-t border-b border-gray-200 py-1.5 my-1.5 space-y-1">
                  <div className="flex justify-between">
                    <span className="truncate pr-1">Signature Item x1</span>
                    <span>
                      {currency}
                      {Number(16.5).toFixed(numDecimals)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="truncate pr-1">House Beverage x1</span>
                    <span>
                      {currency}
                      {Number(8.0).toFixed(numDecimals)}
                    </span>
                  </div>
                </div>

                <div className="space-y-0.5 text-gray-600 text-[9px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>
                      {currency}
                      {sampleSubtotal.toFixed(numDecimals)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      {taxName || "Tax"} ({taxRate || "0"}%):
                    </span>
                    <span>
                      {currency}
                      {calculatedTax.toFixed(numDecimals)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 text-[11px] pt-1 border-t border-gray-200 mt-1">
                    <span>TOTAL:</span>
                    <span>
                      {currency}
                      {sampleTotal.toFixed(numDecimals)}
                    </span>
                  </div>
                </div>

                <div className="text-center text-[9px] text-gray-500 mt-3 pt-2 border-t border-dashed border-gray-200">
                  {receiptFooter || "Thank you for your purchase!"}
                </div>
                <div className="text-center text-[8px] text-gray-300 mt-1">
                  ||||| |||| || |||||||
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 md:px-8 py-5 border-t border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-[#f5c518] hover:bg-yellow-400 text-[#0f2044] text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-2 shadow-md shadow-[#f5c518]/30"
          >
            {loading && <Spinner />} Save Settings & Launch Store →
          </button>
        </div>
      </form>
    </StepCard>
  );
}

// ─── Step 5 — Done! ───────────────────────────────────────────────────────────

function StepDone({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();

  return (
    <StepCard>
      <div className="px-8 py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl text-emerald-600 mx-auto mb-6">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-[#0f2044] mb-2">You&apos;re all set!</h2>
        <p className="text-gray-500 mb-2">Your Izah POS is ready to use.</p>
        {adminEmail && (
          <p className="text-sm text-gray-400 mb-8">
            Admin account:{" "}
            <span className="text-[#0f2044] font-semibold">{adminEmail}</span>
          </p>
        )}

        <div className="space-y-3">
          <button
            onClick={() => router.push("/pos")}
            className="w-full py-3 rounded-xl bg-[#f5c518] hover:bg-yellow-400 text-[#0f2044] font-bold text-sm transition-colors shadow-md shadow-[#f5c518]/30"
          >
            Open POS →
          </button>
          <button
            onClick={() => router.push("/products")}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm transition-colors"
          >
            Add Products First
          </button>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          You can change your business settings anytime in the{" "}
          <button
            onClick={() => router.push("/settings")}
            className="text-[#0f2044] underline font-medium"
          >
            Settings
          </button>{" "}
          page.
        </p>
      </div>
    </StepCard>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [adminEmail, setAdminEmail] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<BusinessPreset | null>(null);

  // On mount: if already set up, redirect to login
  useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((data: SetupStatus) => {
        if (data.setupComplete) {
          router.replace("/login");
        }
      })
      .catch(() => {});
  }, [router]);

  const next = () => setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleTutorialComplete = (preset?: BusinessPreset) => {
    if (preset) {
      setSelectedPreset(preset);
    }
    next();
  };

  return (
    <div className="flex flex-col items-center w-full">
      {step < STEP_LABELS.length - 1 && (
        <ProgressBar
          step={step}
          total={STEP_LABELS.length}
          wide={step === 0 || step === 4}
        />
      )}

      {step === 0 && <TutorialStepWelcome onNext={handleTutorialComplete} />}
      {step === 1 && <StepSystemCheck onNext={next} onBack={back} />}
      {step === 2 && <StepDatabase onNext={next} onBack={back} />}
      {step === 3 && (
        <StepAdminAccount onNext={next} onBack={back} setAdminEmail={setAdminEmail} />
      )}
      {step === 4 && (
        <StepBusinessSettings
          onNext={next}
          onBack={back}
          preset={selectedPreset}
        />
      )}
      {step === 5 && <StepDone adminEmail={adminEmail} />}
    </div>
  );
}

