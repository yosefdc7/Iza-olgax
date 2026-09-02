"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { pluginRegistry, PluginManifest } from "@/lib/plugins";
import { Puzzle, Power } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "izah_plugin_enabled_map";

function loadEnabledMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveEnabledMap(map: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function PluginsPanel() {
  const t = useTranslations("plugins");
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);

  useEffect(() => {
    const stored = loadEnabledMap();
    const list = pluginRegistry.getPlugins();
    for (const p of list) {
      if (stored[p.id] !== undefined) {
        pluginRegistry.setEnabled(p.id, stored[p.id]);
        p.enabled = stored[p.id];
      }
    }
    setPlugins(list);
  }, []);

  const toggle = useCallback((id: string) => {
    setPlugins((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id) {
          const next = !p.enabled;
          pluginRegistry.setEnabled(id, next);
          return { ...p, enabled: next };
        }
        return p;
      });
      const newMap = updated.reduce<Record<string, boolean>>((acc, p) => {
        acc[p.id] = p.enabled;
        return acc;
      }, {});
      saveEnabledMap(newMap);
      return updated;
    });
  }, []);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
          <Puzzle className="h-4 w-4 text-primary" />
          {t("title")}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("description")}
        </p>
      </div>

      {plugins.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground bg-card/50">
          <Puzzle className="h-8 w-8 mx-auto mb-2 opacity-30 text-muted-foreground" />
          <p className="font-medium text-foreground/80">{t("no_plugins")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("no_plugins_hint")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden bg-card">
          {plugins.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-4 px-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono">
                    v{p.version}
                  </span>
                  {p.author && (
                    <span className="text-[10px] text-muted-foreground">
                      {t("by_author", { author: p.author })}
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.hooks.map((h) => (
                    <span
                      key={h}
                      className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5 font-mono"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className={cn(
                  "flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all shadow-xs",
                  p.enabled
                    ? "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                    : "border border-border bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                aria-label={p.enabled ? t("disable_aria") : t("enable_aria")}
              >
                <Power className="h-3 w-3" />
                {p.enabled ? t("enabled") : t("disabled")}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
