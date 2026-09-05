"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Series = { id: string; name: string; nextNumber: number; active: boolean };

export function ReceiptSeriesManager() {
  const [series, setSeries] = useState<Series[]>([]);
  const [name, setName] = useState("");
  const [nextNumber, setNextNumber] = useState(1);

  const load = useCallback(() => {
    fetch("/api/receipt-series")
      .then((response) => response.json())
      .then((data) => setSeries(data.series ?? []));
  }, []);
  useEffect(load, [load]);

  async function createSeries() {
    const response = await fetch("/api/receipt-series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, nextNumber }),
    });
    const data = await response.json();
    if (!response.ok)
      return toast.error(
        typeof data.error === "string" ? data.error : "Could not create receipt series"
      );
    setName("");
    setNextNumber(1);
    load();
    toast.success("Receipt series created");
  }

  async function toggle(item: Series) {
    await fetch("/api/receipt-series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    });
    load();
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Receipt Series</h2>
        <p className="text-muted-foreground text-sm">
          Numbers are assigned atomically at completed checkout and are never reused.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Series name, e.g. 211"
          className="bg-background h-10 rounded-md border px-3 text-sm"
        />
        <input
          type="number"
          min={1}
          value={nextNumber}
          onChange={(event) => setNextNumber(Number(event.target.value))}
          className="bg-background h-10 rounded-md border px-3 text-sm"
        />
        <button
          type="button"
          onClick={createSeries}
          disabled={!name.trim() || nextNumber < 1}
          className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm font-medium disabled:opacity-50"
        >
          Add series
        </button>
      </div>
      <div className="divide-y rounded-md border">
        {series.length === 0 && (
          <p className="text-muted-foreground p-4 text-sm">No receipt series configured.</p>
        )}
        {series.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <span className="font-semibold">{item.name}</span>
              <span className="text-muted-foreground ml-3">
                Next: {String(item.nextNumber).padStart(6, "0")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggle(item)}
              className="rounded-md border px-3 py-1 text-xs"
            >
              {item.active ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
