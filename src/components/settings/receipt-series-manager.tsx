"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Building2, CheckCircle2, XCircle, ArrowUpRight } from "lucide-react";

type Series = {
  id: string;
  name: string;
  nextNumber: number;
  active: boolean;
  _count?: { sales: number };
};

export function ReceiptSeriesManager() {
  const [series, setSeries] = useState<Series[]>([]);
  const [name, setName] = useState("");
  const [nextNumber, setNextNumber] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNextNumber, setEditNextNumber] = useState<number>(1);

  const load = useCallback(() => {
    fetch("/api/receipt-series")
      .then((response) => response.json())
      .then((data) => setSeries(data.series ?? []))
      .catch(() => toast.error("Failed to load company receipt series"));
  }, []);

  useEffect(load, [load]);

  async function handleAdd(seriesName?: string) {
    const targetName = (seriesName ?? name).trim();
    if (!targetName) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/receipt-series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: targetName, nextNumber: seriesName ? 1 : nextNumber }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Could not create receipt series");
        return;
      }
      setName("");
      setNextNumber(1);
      load();
      toast.success(`Company receipt series "${targetName}" added`);
    } catch {
      toast.error("Network error while adding company receipt series");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(item: Series) {
    try {
      const response = await fetch("/api/receipt-series", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, active: !item.active }),
      });
      if (!response.ok) {
        toast.error("Could not update series status");
        return;
      }
      load();
      toast.success(`${item.name} is now ${!item.active ? "active in POS dropdown" : "inactive"}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleSaveNextNumber(item: Series) {
    if (editNextNumber < 1) {
      toast.error("Next number must be 1 or greater");
      return;
    }
    try {
      const response = await fetch("/api/receipt-series", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, nextNumber: editNextNumber }),
      });
      if (!response.ok) {
        toast.error("Could not update next number");
        return;
      }
      setEditingId(null);
      load();
      toast.success(`Updated next number for ${item.name} to #${String(editNextNumber).padStart(6, "0")}`);
    } catch {
      toast.error("Failed to update next number");
    }
  }

  async function handleDelete(item: Series) {
    if (!confirm(`Are you sure you want to delete company receipt series "${item.name}"?`)) {
      return;
    }
    try {
      const response = await fetch(`/api/receipt-series?id=${item.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Could not delete series");
        return;
      }
      load();
      toast.success(`Deleted company receipt series "${item.name}"`);
    } catch {
      toast.error("Network error deleting receipt series");
    }
  }

  const has211 = series.some((s) => s.name.toUpperCase() === "211");
  const hasCHB = series.some((s) => s.name.toUpperCase() === "CHB");

  return (
    <section id="receipt-series-settings" className="space-y-5 scroll-mt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Company Receipts</h2>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your company receipt series (e.g. <strong>211</strong>, <strong>CHB</strong>). All active company receipt series appear directly in the POS cart dropdown selection for cashiers to choose at checkout.
          </p>
        </div>
      </div>

      {/* Quick Add Presets if 211 or CHB missing */}
      {(!has211 || !hasCHB) && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
          <span className="text-muted-foreground font-medium">Quick add company receipt:</span>
          {!has211 && (
            <button
              type="button"
              onClick={() => handleAdd("211")}
              disabled={submitting}
              className="inline-flex items-center gap-1 rounded-md border border-primary bg-background px-2.5 py-1 font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" /> Add 211
            </button>
          )}
          {!hasCHB && (
            <button
              type="button"
              onClick={() => handleAdd("CHB")}
              disabled={submitting}
              className="inline-flex items-center gap-1 rounded-md border border-primary bg-background px-2.5 py-1 font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" /> Add CHB
            </button>
          )}
        </div>
      )}

      {/* Add Company Receipt Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd();
        }}
        className="grid gap-2.5 sm:grid-cols-[1fr_9rem_auto]"
      >
        <div>
          <label htmlFor="company-name" className="text-muted-foreground block text-xs font-medium mb-1">
            Company / Series Name
          </label>
          <input
            id="company-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. 211, CHB, HQ"
            className="bg-background h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          />
        </div>
        <div>
          <label htmlFor="starting-seq" className="text-muted-foreground block text-xs font-medium mb-1">
            Next Number
          </label>
          <input
            id="starting-seq"
            type="number"
            min={1}
            value={nextNumber}
            onChange={(event) => setNextNumber(Math.max(1, Number(event.target.value) || 1))}
            className="bg-background h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={!name.trim() || nextNumber < 1 || submitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full sm:w-auto rounded-md px-4 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {submitting ? "Adding…" : "Add Company Receipt"}
          </button>
        </div>
      </form>

      {/* List of Configured Series */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="bg-muted/40 border-b px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
          <span>Configured Company Receipts</span>
          <span>{series.length} configured</span>
        </div>
        {series.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
            No company receipt series configured. Add <strong>211</strong> or <strong>CHB</strong> above.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {series.map((item) => {
              const isEditing = editingId === item.id;
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold tracking-wide text-foreground">
                        {item.name}
                      </span>
                      {item.active ? (
                        <span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" /> Active in POS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>Next Receipt:</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 font-sans">
                          <input
                            type="number"
                            min={1}
                            value={editNextNumber}
                            onChange={(e) => setEditNextNumber(Number(e.target.value))}
                            className="bg-background h-7 w-24 rounded border px-2 text-xs font-mono"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveNextNumber(item)}
                            className="rounded bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded border px-2 py-1 text-[11px] text-muted-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingId(item.id);
                            setEditNextNumber(item.nextNumber);
                          }}
                          className="font-bold text-foreground cursor-pointer hover:underline"
                          title="Click to edit next number"
                        >
                          #{String(item.nextNumber).padStart(6, "0")} (click to edit)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                    >
                      {item.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="rounded-md border border-destructive/20 text-destructive hover:bg-destructive/10 p-1.5 transition-colors cursor-pointer"
                      title="Delete receipt series"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1 font-medium text-foreground">
          <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
          Tip for Cashiers:
        </p>
        <p className="mt-0.5">
          In the POS register, the company receipt dropdown lists all active series above. Selecting <strong>211</strong> or <strong>CHB</strong> will print and log the sale under that specific company series.
        </p>
      </div>
    </section>
  );
}
