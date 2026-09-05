"use client";

import { useState } from "react";
import { DailySalesLedger } from "./daily-sales-ledger";
import { ReportsDashboard } from "./reports-dashboard";

export function ReportsWorkspace({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<"overview" | "ledger">(isAdmin ? "overview" : "ledger");
  return (
    <div className="space-y-5">
      {isAdmin && (
        <div className="flex gap-2 border-b print:hidden">
          <button
            onClick={() => setTab("overview")}
            className={`px-3 py-2 text-sm font-semibold ${tab === "overview" ? "border-primary text-primary border-b-2" : "text-muted-foreground"}`}
          >
            Overview & Stock
          </button>
          <button
            onClick={() => setTab("ledger")}
            className={`px-3 py-2 text-sm font-semibold ${tab === "ledger" ? "border-primary text-primary border-b-2" : "text-muted-foreground"}`}
          >
            Daily Sales Ledger
          </button>
        </div>
      )}
      {tab === "overview" && isAdmin ? (
        <ReportsDashboard />
      ) : (
        <DailySalesLedger isAdmin={isAdmin} />
      )}
    </div>
  );
}
