"use client";

import {
  resetDashboardLayout,
  saveDashboardLayout,
} from "@/lib/dashboard/layout-api-client";
import {
  ALL_WIDGET_KEYS,
  DEFAULT_LAYOUT_CONFIG,
  HEADER_WIDGET_KEYS,
  LEADS_DASHBOARD_PAGE_KEY,
  SIDEBAR_WIDGET_KEYS,
  WIDGET_LABELS,
  type DashboardLayoutConfig,
  type LayoutConfigSource,
  type WidgetKey,
} from "@/lib/dashboard/layout-config";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export type LayoutControlsProps = {
  readonly initialConfig: DashboardLayoutConfig;
  readonly initialSource: LayoutConfigSource;
};

type StatusMessage = {
  readonly tone: "success" | "error";
  readonly text: string;
};

function moveWidget(
  order: readonly WidgetKey[],
  key: WidgetKey,
  direction: "up" | "down",
): WidgetKey[] {
  const index = order.indexOf(key);
  if (index === -1) {
    return [...order];
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= order.length) {
    return [...order];
  }

  const next = [...order];
  const swap = next[targetIndex];
  if (!swap) {
    return next;
  }
  next[index] = swap;
  next[targetIndex] = key;
  return next;
}

function zoneLabel(key: WidgetKey): string {
  if (HEADER_WIDGET_KEYS.includes(key)) {
    return "Header";
  }
  if (SIDEBAR_WIDGET_KEYS.includes(key)) {
    return "Sidebar";
  }
  return "Panel";
}

export function LayoutControls({
  initialConfig,
  initialSource,
}: LayoutControlsProps) {
  const router = useRouter();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [draft, setDraft] = useState<DashboardLayoutConfig>(initialConfig);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  useEffect(() => {
    setDraft(initialConfig);
  }, [initialConfig]);

  const hiddenSet = new Set(draft.hidden ?? []);

  const setStatusMessage = useCallback((message: StatusMessage | null) => {
    setStatus(message);
  }, []);

  const handleMove = useCallback((key: WidgetKey, direction: "up" | "down") => {
    setDraft((current) => ({
      ...current,
      order: moveWidget(current.order, key, direction),
    }));
    setStatusMessage(null);
  }, [setStatusMessage]);

  const handleToggleHidden = useCallback((key: WidgetKey) => {
    setDraft((current) => {
      const hidden = new Set(current.hidden ?? []);
      if (hidden.has(key)) {
        hidden.delete(key);
      } else {
        hidden.add(key);
      }
      return {
        ...current,
        hidden: [...hidden],
      };
    });
    setStatusMessage(null);
  }, [setStatusMessage]);

  const handleSave = useCallback(async () => {
    setBusy(true);
    setStatusMessage(null);
    try {
      const result = await saveDashboardLayout(
        LEADS_DASHBOARD_PAGE_KEY,
        draft,
      );
      if (!result.ok) {
        setStatusMessage({ tone: "error", text: result.message });
        return;
      }
      setStatusMessage({ tone: "success", text: "Layout saved." });
      setCustomizeOpen(false);
      router.refresh();
    } catch {
      setStatusMessage({ tone: "error", text: "Unable to save layout." });
    } finally {
      setBusy(false);
    }
  }, [draft, router, setStatusMessage]);

  const handleReset = useCallback(async () => {
    setBusy(true);
    setStatusMessage(null);
    try {
      const result = await resetDashboardLayout(LEADS_DASHBOARD_PAGE_KEY);
      if (!result.ok) {
        setStatusMessage({ tone: "error", text: result.message });
        return;
      }
      setDraft(DEFAULT_LAYOUT_CONFIG);
      setStatusMessage({ tone: "success", text: "Layout reset to default." });
      setCustomizeOpen(false);
      router.refresh();
    } catch {
      setStatusMessage({ tone: "error", text: "Unable to reset layout." });
    } finally {
      setBusy(false);
    }
  }, [router, setStatusMessage]);

  return (
    <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Layout
          </p>
          <p className="text-[11px] text-slate-400">
            Source: {initialSource === "saved" ? "Saved" : "Default"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCustomizeOpen((open) => !open)}
            className="rounded-md border border-slate-700/80 bg-slate-900/60 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-800/80"
            disabled={busy}
          >
            {customizeOpen ? "Hide customize" : "Customize layout"}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200 hover:bg-cyan-500/20"
            disabled={busy}
          >
            Save layout
          </button>
          <button
            type="button"
            onClick={() => void handleReset()}
            className="rounded-md border border-slate-700/80 bg-slate-900/60 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800/80"
            disabled={busy}
          >
            Reset layout
          </button>
        </div>
      </div>

      {status ? (
        <p
          className={`mt-2 text-[11px] ${
            status.tone === "success" ? "text-emerald-400" : "text-rose-400"
          }`}
          role="status"
        >
          {status.text}
        </p>
      ) : null}

      {customizeOpen ? (
        <ul className="mt-3 space-y-2 border-t border-slate-800/60 pt-3">
          {ALL_WIDGET_KEYS.map((key) => {
            const orderIndex = draft.order.indexOf(key);
            const isHidden = hiddenSet.has(key);
            return (
              <li
                key={key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/60 bg-slate-900/30 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200">
                    {WIDGET_LABELS[key]}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {zoneLabel(key)}
                    {isHidden ? " · Hidden" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${WIDGET_LABELS[key]} up`}
                    onClick={() => handleMove(key, "up")}
                    disabled={busy || orderIndex <= 0}
                    className="rounded border border-slate-700/80 px-2 py-0.5 text-[10px] text-slate-300 disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${WIDGET_LABELS[key]} down`}
                    onClick={() => handleMove(key, "down")}
                    disabled={busy || orderIndex >= draft.order.length - 1}
                    className="rounded border border-slate-700/80 px-2 py-0.5 text-[10px] text-slate-300 disabled:opacity-40"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleHidden(key)}
                    disabled={busy}
                    className="rounded border border-slate-700/80 px-2 py-0.5 text-[10px] text-slate-300"
                  >
                    {isHidden ? "Show" : "Hide"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
