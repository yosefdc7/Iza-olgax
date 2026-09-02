"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Loader2, AlertTriangle, Download, Printer } from "lucide-react";

type Range = "today" | "week" | "month" | "custom";
type Tab = "overview" | "lowStock";

interface Summary {
  revenue: number;
  grossProfit: number;
  transactions: number;
  tips: number;
  avgTransaction: number;
  voidedCount: number;
  refundCount: number;
  refundTotal: number;
  customerVisits: number;
}

interface RevenueDay { date: string; revenue: number; transactions: number }
interface PieSlice { method: string; value: number }
interface TopProduct { name: string; qty: number; revenue: number }
interface LowStockProduct { id: string; name: string; sku: string | null; stock: number; lowStockThreshold: number; category: string | null }

const PIE_COLORS = ["#0f2044", "#f5c518", "#10b981", "#3b82f6", "#8b5cf6"];

export function ReportsDashboard() {
  const t = useTranslations("reports");
  const tp = useTranslations("products");
  const [range, setRange] = useState<Range>("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [excludeRefunds, setExcludeRefunds] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [revenueByDay, setRevenueByDay] = useState<RevenueDay[]>([]);
  const [pieData, setPieData] = useState<PieSlice[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/reports?range=${range}`;
      if (range === "custom" && from && to) url += `&from=${from}&to=${to}`;
      const res = await fetch(url);
      const data = await res.json();
      setSummary(data.summary);
      setRevenueByDay(data.revenueByDay || []);
      setPieData(data.pieData || []);
      setTopProducts(data.topProducts || []);
      setLowStock(data.lowStock || []);
    } finally {
      setLoading(false);
    }
  }, [range, from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handlePrint() {
    setTimeout(() => window.print(), 100);
  }

  function handleExportCSV() {
    if (!summary) return;
    const rangeLabel = range === "today" ? t("today") : range === "week" ? t("this_week") : range === "month" ? t("this_month") : `${from} to ${to}`;
    const rows: string[][] = [];

    rows.push(["Izah POS — Report Export"]);
    rows.push(["Period", rangeLabel]);
    rows.push(["Generated", new Date().toLocaleString()]);
    rows.push([]);

    rows.push(["SUMMARY"]);
    rows.push(["Metric", "Value"]);
    stats.forEach(s => rows.push([s.label, s.value]));
    rows.push([]);

    rows.push(["TOP SELLING PRODUCTS"]);
    rows.push(["Product", "Units Sold", "Revenue"]);
    topProducts.forEach(p => rows.push([p.name, String(p.qty), formatCurrency(p.revenue)]));
    rows.push([]);

    rows.push(["REVENUE BY DAY"]);
    rows.push(["Date", "Revenue", "Transactions"]);
    revenueByDay.forEach(d => rows.push([d.date, formatCurrency(d.revenue), String(d.transactions)]));
    rows.push([]);

    rows.push(["PAYMENT METHODS"]);
    rows.push(["Method", "Amount"]);
    pieData.forEach(d => rows.push([d.method, formatCurrency(d.value)]));

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `izah-report-${rangeLabel.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const stats = summary
    ? [
        {
          label: excludeRefunds ? t("net_revenue") : t("revenue"),
          value: formatCurrency(excludeRefunds
            ? Math.max(0, summary.revenue - (summary.refundTotal ?? 0))
            : summary.revenue),
          highlight: true,
        },
        { label: t("gross_profit"), value: formatCurrency(summary.grossProfit ?? 0) },
        { label: t("transactions"), value: summary.transactions.toString() },
        { label: t("avg_transaction"), value: formatCurrency(summary.avgTransaction) },
        { label: t("tips"), value: formatCurrency(summary.tips) },
        { label: t("voided"), value: summary.voidedCount.toString() },
        { label: t("refunds"), value: `${summary.refundCount ?? 0} (${formatCurrency(summary.refundTotal ?? 0)})` },
        { label: t("customer_visits"), value: summary.customerVisits.toString() },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Izah POS — {t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {range === "today" ? t("today") : range === "week" ? t("this_week") : range === "month" ? t("this_month") : `${from} – ${to}`}
          {" · "}
          {t(excludeRefunds ? "net_revenue" : "revenue")}
          {" · "}
          {new Date().toLocaleDateString()}
        </p>
        <hr className="mt-3 border-gray-300" />
      </div>

      {/* Tab selector with Variant A underline tabs */}
      <div className="flex items-center justify-between border-b border-border/80 print:hidden">
        <div className="flex gap-2">
          {(["overview", "lowStock"] as Tab[]).map((tabId) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors -mb-px ${
                tab === tabId
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabId === "overview" ? (
                <span>{t("overview")}</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span>{t("low_stock")}</span>
                  {lowStock.length > 0 && (
                    <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                      {lowStock.length}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-md border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t("export_csv")}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-md border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{t("print")}</span>
          </button>
        </div>
      </div>

      {/* Range controls & filters */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {(["today", "week", "month", "custom"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              range === r
                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                : "border-border/80 text-muted-foreground hover:bg-muted/40 hover:text-foreground bg-card"
            }`}
          >
            {r === "today" ? t("today") : r === "week" ? t("this_week") : r === "month" ? t("this_month") : t("custom")}
          </button>
        ))}

        {range === "custom" && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            />
            <button
              onClick={fetchData}
              disabled={!from || !to}
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 transition-colors shadow-2xs"
            >
              Apply
            </button>
          </div>
        )}

        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}

        <label className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={excludeRefunds}
            onChange={(e) => setExcludeRefunds(e.target.checked)}
            className="accent-primary"
          />
          <span>{t("exclude_refunds")}</span>
        </label>
      </div>

      {/* ===== LOW STOCK TAB ===== */}
      {tab === "lowStock" && (
        <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-border/80 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                {t("low_stock_products")}
              </h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {lowStock.length} items
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-border/80 bg-muted/40">
                <tr className="text-[11px] text-muted-foreground/90 uppercase font-bold tracking-wider">
                  <th className="px-4 py-3">{t("product")}</th>
                  <th className="px-4 py-3">{tp("sku")}</th>
                  <th className="px-4 py-3">{tp("category")}</th>
                  <th className="px-4 py-3 text-right">{tp("stock")}</th>
                  <th className="px-4 py-3 text-right">{t("threshold")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {lowStock.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      {t("all_stocked")}
                    </td>
                  </tr>
                ) : (
                  lowStock.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-foreground">{p.name}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{p.sku ?? "—"}</td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{p.category ?? "—"}</td>
                      <td className={`px-4 py-3.5 text-right font-mono font-bold ${p.stock === 0 ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`}>
                        {p.stock}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-muted-foreground">{p.lowStockThreshold}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== OVERVIEW TAB ===== */}
      {tab === "overview" && (
        <>
          {/* Summary Metric Cards with Variant A Hairline Borders */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-border/80 bg-card p-4 space-y-1.5 shadow-xs hover:border-primary/40 transition-colors"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  {s.label}
                </p>
                <p className={`text-2xl font-extrabold font-mono tracking-tight ${s.highlight ? "text-primary" : "text-foreground"}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Charts with Crisp Borders */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue Trend */}
            <div className="lg:col-span-2 rounded-lg border border-border/80 bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/60">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {t("revenue_trend")}
                </h2>
              </div>
              {revenueByDay.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
                  {t("no_data")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={230} minWidth={300}>
                  <BarChart data={revenueByDay} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => {
                        const d = new Date(v + "T00:00:00");
                        return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
                      }}
                    />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} width={48} />
                    <Tooltip
                      formatter={(v: number | undefined) => [v !== undefined ? formatCurrency(v) : "$0.00", "Revenue"]}
                      labelFormatter={(l) => new Date(l + "T00:00:00").toLocaleDateString()}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
                    />
                    <Bar dataKey="revenue" fill="currentColor" className="text-primary" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Payment Breakdown Pie */}
            <div className="rounded-lg border border-border/80 bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/60">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {t("payment_methods")}
                </h2>
              </div>
              {pieData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
                  {t("no_data")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={230} minWidth={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="method"
                      cx="50%"
                      cy="45%"
                      outerRadius={75}
                      label={({ method, percent }) => `${method} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                      isAnimationActive={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-border/80 bg-muted/20">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                {t("top_selling_products")}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-border/80 bg-muted/40">
                  <tr className="text-[11px] text-muted-foreground/90 uppercase font-bold tracking-wider">
                    <th className="px-4 py-3">{t("product")}</th>
                    <th className="px-4 py-3 text-right">{t("units_sold")}</th>
                    <th className="px-4 py-3 text-right">{t("revenue")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        {t("no_sales_data")}
                      </td>
                    </tr>
                  ) : (
                    topProducts.map((p, i) => (
                      <tr key={`${p.name}-${i}`} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-foreground">{p.name}</td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold">{p.qty}</td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-primary">
                          {formatCurrency(p.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
