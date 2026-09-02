"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, ChevronDown, ChevronRight, Receipt } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { RefundModal } from "./refund-modal";

interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  price: { toString(): string };
  total: { toString(): string };
  notes?: string | null;
  productId?: string | null;
}

interface Sale {
  id: string;
  createdAt: Date;
  total: { toString(): string };
  paymentMethod: string;
  status: string;
  items: SaleItem[];
  user: { name: string } | null;
}

interface SalesTableProps {
  sales: Sale[];
}

export function SalesTable({ sales }: SalesTableProps) {
  const t = useTranslations("sales");
  const tr = useTranslations("receipt");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<Sale | null>(null);

  const saleDateFormatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

  if (sales.length === 0) {
    return (
      <div className="flex flex-col h-48 items-center justify-center rounded-lg border border-dashed border-border/80 text-muted-foreground text-sm bg-card/40 p-6 text-center">
        <Receipt className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="font-semibold text-foreground/70">{t("no_sales")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead className="border-b border-border/80 bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                  {t("date")}
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                  {t("cashier")}
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                  {t("payment")}
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                  {t("status")}
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 text-right">
                  {t("total")}
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 text-center">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sales.flatMap((sale, idx) => {
                const saleTimestamp = new Date(sale.createdAt).getTime();
                const saleKey = `${sale.id ?? "no-id"}-${saleTimestamp}-${idx}`;
                const isExpanded = expanded === sale.id;

                const mainRow = (
                  <tr
                    key={`${saleKey}-main`}
                    className={cn(
                      "hover:bg-muted/30 cursor-pointer transition-colors",
                      isExpanded && "bg-muted/20"
                    )}
                    onClick={() => setExpanded(isExpanded ? null : sale.id)}
                  >
                    <td className="px-4 py-3.5 font-mono text-xs text-foreground font-medium">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span>{saleDateFormatter.format(new Date(sale.createdAt))}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground font-medium">
                      {sale.user?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium">
                      <span className="inline-block px-2 py-0.5 rounded bg-muted/60 text-foreground text-[11px] font-mono">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                          sale.status === "COMPLETED" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                          sale.status === "VOIDED" && "bg-destructive/10 text-destructive border-destructive/20",
                          sale.status === "REFUNDED" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        )}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground">
                      {formatCurrency(parseFloat(sale.total.toString()))}
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        {sale.status === "COMPLETED" && (
                          <button
                            onClick={() => setRefunding(sale)}
                            className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors shadow-2xs"
                            title="Issue Refund"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>{t("refund")}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );

                if (!isExpanded) {
                  return [mainRow];
                }

                const detailRow = (
                  <tr className="bg-muted/15" key={`${saleKey}-details`}>
                    <td colSpan={6} className="px-6 py-4 border-t border-border/40">
                      <div className="rounded-md border border-border/60 bg-card p-3 shadow-2xs">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          {tr("receipt")} ({sale.items.length})
                        </p>
                        <table className="w-full text-xs">
                          <thead className="border-b border-border/40 text-muted-foreground font-semibold">
                            <tr>
                              <th className="text-left py-1.5">{tr("items")}</th>
                              <th className="text-right py-1.5">{tr("qty")}</th>
                              <th className="text-right py-1.5">{tr("price")}</th>
                              <th className="text-right py-1.5">{t("total")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {sale.items.map((item, i) => {
                              const itemKey = `${item.id ?? "no-item-id"}-${saleKey}-${i}`;
                              return (
                                <tr key={itemKey}>
                                  <td className="py-2 font-medium text-foreground">
                                    {item.name}
                                    {item.notes && (
                                      <p className="text-[10px] text-muted-foreground italic mt-0.5">{item.notes}</p>
                                    )}
                                  </td>
                                  <td className="text-right py-2 font-mono">{item.quantity}</td>
                                  <td className="text-right py-2 font-mono text-muted-foreground">
                                    {formatCurrency(parseFloat(item.price.toString()))}
                                  </td>
                                  <td className="text-right py-2 font-mono font-bold text-foreground">
                                    {formatCurrency(parseFloat(item.total.toString()))}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                );

                return [mainRow, detailRow];
              })}
            </tbody>
          </table>
        </div>
      </div>

      {refunding && (
        <RefundModal
          saleId={refunding.id}
          saleTotal={parseFloat(refunding.total.toString())}
          items={refunding.items}
          onClose={() => setRefunding(null)}
        />
      )}
    </>
  );
}
