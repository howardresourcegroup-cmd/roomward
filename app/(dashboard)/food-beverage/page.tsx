"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  UtensilsCrossed, Wine, Coffee, ConciergeBell, ChefHat,
  PackageSearch, Thermometer, TriangleAlert, CircleCheck, Plus, Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useFnbOutlets, useFnbInventory, useFnbTempLogs, usePermissions } from "@/lib/data/hooks";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import type { FnbInventoryItem, OutletKind } from "@/types";

type Tab = "outlets" | "inventory" | "temps";

const OUTLET_ICON: Record<OutletKind, React.ElementType> = {
  restaurant: UtensilsCrossed,
  bar: Wine,
  cafe: Coffee,
  room_service: ConciergeBell,
  banquet_kitchen: ChefHat,
};

const OUTLET_LABEL: Record<OutletKind, string> = {
  restaurant: "Restaurant",
  bar: "Bar",
  cafe: "Café",
  room_service: "Room service",
  banquet_kitchen: "Banquet kitchen",
};

/** "06:30" → "6:30 AM". Times come back from Postgres as HH:MM:SS. */
function prettyTime(t: string | null): string | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export default function FoodBeveragePage() {
  const [tab, setTab] = useState<Tab>("outlets");
  const { outlets, loading: outletsLoading, error: outletsError, reload: reloadOutlets, toggleOpen } = useFnbOutlets();
  const { items, loading: itemsLoading, error: itemsError, reload: reloadItems, count } = useFnbInventory();
  const { logs, loading: logsLoading, error: logsError, reload: reloadLogs } = useFnbTempLogs();
  const { can } = usePermissions();
  const canManage = can("fnb.manage");

  const belowPar = useMemo(() => items.filter((i) => i.on_hand <= i.par_level), [items]);
  const failing = useMemo(() => {
    // Only the most recent reading per piece of equipment matters — an old
    // failure that has since been corrected is history, not an active problem.
    const latest = new Map<string, typeof logs[number]>();
    for (const l of logs) if (!latest.has(l.equipment_label)) latest.set(l.equipment_label, l);
    return [...latest.values()].filter((l) => !l.in_range);
  }, [logs]);

  const lowStockByOutlet = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of belowPar) if (i.outlet_id) m.set(i.outlet_id, (m.get(i.outlet_id) ?? 0) + 1);
    return m;
  }, [belowPar]);

  if (outletsLoading && itemsLoading && logsLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Food &amp; Beverage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Outlets, par-level stock, and food-safety temperature logs.
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
          {failing.length > 0 ? (
            <span className="flex items-center gap-1.5 text-red-400">
              <TriangleAlert className="h-3.5 w-3.5" />
              {failing.length} unit{failing.length === 1 ? "" : "s"} out of safe range
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CircleCheck className="h-3.5 w-3.5" /> All temperatures in range
            </span>
          )}
          <span className={cn("flex items-center gap-1.5", belowPar.length > 0 ? "text-amber-400" : "text-muted-foreground")}>
            <PackageSearch className="h-3.5 w-3.5" />
            {belowPar.length} line{belowPar.length === 1 ? "" : "s"} at or below par
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex w-fit max-w-full overflow-x-auto rounded-lg border border-border p-0.5 gap-0.5">
        {([
          { key: "outlets" as Tab,   icon: Store,        label: "Outlets" },
          { key: "inventory" as Tab, icon: PackageSearch,label: "Inventory" },
          { key: "temps" as Tab,     icon: Thermometer,  label: "Temperature log" },
        ]).map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap text-sm px-4 py-2 rounded-md transition-colors",
              tab === key ? "bg-foreground/[0.08] text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            )}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Outlets ── */}
      {tab === "outlets" && (
        outletsError ? <ErrorState what="the outlets" onRetry={reloadOutlets} />
        : outlets.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No outlets yet"
            description="Add your restaurants, bars and cafés to track their stock and equipment here."
            hint="Each outlet gets its own par-level list and temperature log."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {outlets.map((o, i) => {
              const Icon = OUTLET_ICON[o.kind] ?? UtensilsCrossed;
              const low = lowStockByOutlet.get(o.id) ?? 0;
              const open = prettyTime(o.opens_at);
              const close = prettyTime(o.closes_at);
              return (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.2) }}
                  className="glass-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/[0.05] border border-border shrink-0">
                        <Icon className="h-4 w-4 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{o.name}</p>
                        <p className="text-[11px] text-muted-foreground">{OUTLET_LABEL[o.kind] ?? o.kind}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 border shrink-0",
                      o.is_open
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                        : "text-muted-foreground bg-foreground/[0.04] border-border"
                    )}>
                      {o.is_open ? "Open" : "Closed"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {open && close && <p>{open} – {close}</p>}
                    {o.seats != null && <p>{o.seats} seats</p>}
                    {o.notes && <p className="text-muted-foreground/80">{o.notes}</p>}
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                    <span className={cn("text-xs flex items-center gap-1.5", low > 0 ? "text-amber-400" : "text-muted-foreground")}>
                      <PackageSearch className="h-3.5 w-3.5" />
                      {low > 0 ? `${low} to reorder` : "Stock OK"}
                    </span>
                    {canManage && (
                      <Button size="sm" variant="ghost" onClick={() => toggleOpen(o.id, !o.is_open)}>
                        {o.is_open ? "Mark closed" : "Mark open"}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      {/* ── Inventory ── */}
      {tab === "inventory" && (
        itemsError ? <ErrorState what="the stock list" onRetry={reloadItems} />
        : items.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No stock lines yet"
            description="Add the items you count, with a par level for each, and shortfalls will surface here."
            hint="A line appears in the reorder list once it drops to its par level."
          />
        ) : (
          <InventoryTable items={items} canManage={canManage} onCount={count} />
        )
      )}

      {/* ── Temperatures ── */}
      {tab === "temps" && (
        logsError ? <ErrorState what="the temperature log" onRetry={reloadLogs} />
        : <TempLogPanel />
      )}
    </div>
  );
}

// ─── Inventory ───────────────────────────────────────────────────────────────
function InventoryTable({
  items, canManage, onCount,
}: {
  items: FnbInventoryItem[];
  canManage: boolean;
  onCount: (id: string, onHand: number) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showBelowOnly, setShowBelowOnly] = useState(false);

  const rows = useMemo(
    () => (showBelowOnly ? items.filter((i) => i.on_hand <= i.par_level) : items),
    [items, showBelowOnly]
  );

  const commit = (item: FnbInventoryItem) => {
    const n = Number(draft);
    setEditing(null);
    if (!Number.isFinite(n) || n < 0) { toast.error("Enter a number of zero or more"); return; }
    if (n === item.on_hand) return;
    onCount(item.id, n);
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <p className="text-sm text-muted-foreground">
          {rows.length} line{rows.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={() => setShowBelowOnly((v) => !v)}
          aria-pressed={showBelowOnly}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors min-h-[32px]",
            showBelowOnly
              ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
              : "border-border bg-foreground/[0.03] text-muted-foreground hover:text-foreground"
          )}
        >
          Below par only
        </button>
      </div>

      {/* Phones get stacked cards: a six-column table on a 390px screen is a
          horizontal-scroll puzzle, and counting stock is very much a phone job. */}
      <div className="space-y-2 md:hidden">
        {rows.map((i) => {
          const short = i.on_hand <= i.par_level;
          return (
            <div key={i.id} className={cn(
              "rounded-lg border p-3",
              short ? "border-amber-500/30 bg-amber-500/[0.05]" : "border-border bg-foreground/[0.02]"
            )}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-foreground flex items-center gap-1.5">
                    {short && <TriangleAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden />}
                    <span className="truncate">{i.name}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {[i.outlet?.name, i.category].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                {canManage && editing === i.id ? (
                  <Input
                    autoFocus type="number" min={0} step="any"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commit(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commit(i);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="h-9 w-24 text-right shrink-0"
                    aria-label={`On-hand count for ${i.name}`}
                  />
                ) : (
                  <button
                    disabled={!canManage}
                    onClick={() => { setEditing(i.id); setDraft(String(i.on_hand)); }}
                    className={cn(
                      "text-right shrink-0 rounded-md px-2 py-1 min-h-[36px] transition-colors",
                      canManage && "hover:bg-foreground/[0.06] active:scale-[0.98]"
                    )}
                  >
                    <span className={cn("block text-sm font-semibold tabular-nums", short ? "text-amber-400" : "text-foreground")}>
                      {i.on_hand} {i.unit}
                    </span>
                    <span className="block text-[10px] text-muted-foreground tabular-nums">par {i.par_level}</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-2">
                {i.supplier ?? "No supplier"} ·{" "}
                {i.last_counted_at ? `counted ${formatDistanceToNow(new Date(i.last_counted_at))} ago` : "never counted"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto -mx-1 px-1 hidden md:block">
        <table className="w-full text-sm min-w-[620px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className="text-left font-medium py-2 px-2">Item</th>
              <th scope="col" className="text-left font-medium py-2 px-2">Outlet</th>
              <th scope="col" className="text-right font-medium py-2 px-2">On hand</th>
              <th scope="col" className="text-right font-medium py-2 px-2">Par</th>
              <th scope="col" className="text-left font-medium py-2 px-2">Counted</th>
              <th scope="col" className="text-left font-medium py-2 px-2">Supplier</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const short = i.on_hand <= i.par_level;
              return (
                <tr key={i.id} className="border-b border-border/50 last:border-0 hover:bg-foreground/[0.02]">
                  <td className="py-2 px-2">
                    <span className="flex items-center gap-1.5 text-foreground">
                      {short && <TriangleAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden />}
                      {i.name}
                      {short && <span className="sr-only">(below par)</span>}
                    </span>
                    {i.category && <span className="text-[11px] text-muted-foreground">{i.category}</span>}
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{i.outlet?.name ?? "—"}</td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {canManage && editing === i.id ? (
                      <Input
                        autoFocus type="number" min={0} step="any"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commit(i)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commit(i);
                          if (e.key === "Escape") setEditing(null);
                        }}
                        className="h-8 w-24 text-right ml-auto"
                        aria-label={`On-hand count for ${i.name}`}
                      />
                    ) : (
                      <button
                        disabled={!canManage}
                        onClick={() => { setEditing(i.id); setDraft(String(i.on_hand)); }}
                        className={cn(
                          "tabular-nums rounded px-1.5 py-1 min-h-[28px] transition-colors",
                          short ? "text-amber-400 font-medium" : "text-foreground",
                          canManage ? "hover:bg-foreground/[0.06]" : "cursor-default"
                        )}
                        title={canManage ? "Click to record a count" : undefined}
                      >
                        {i.on_hand} {i.unit}
                      </button>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{i.par_level} {i.unit}</td>
                  <td className="py-2 px-2 text-muted-foreground text-xs">
                    {i.last_counted_at ? `${formatDistanceToNow(new Date(i.last_counted_at))} ago` : "Never"}
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{i.supplier ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-emerald-400 text-center py-8 flex items-center justify-center gap-2">
          <CircleCheck className="h-4 w-4" /> Everything is above par.
        </p>
      )}
    </div>
  );
}

// ─── Temperature log ─────────────────────────────────────────────────────────
const TEMP_PRESETS = [
  { label: "Walk-in cooler",      min: 33,  max: 41 },
  { label: "Walk-in freezer",     min: -10, max: 5 },
  { label: "Line reach-in",       min: 33,  max: 41 },
  { label: "Bar cooler",          min: 33,  max: 41 },
  { label: "Hot line steam well", min: 140, max: 180 },
];

function TempLogPanel() {
  const { logs, loading, log } = useFnbTempLogs();
  const { outlets } = useFnbOutlets();
  const { can } = usePermissions();
  const canManage = can("fnb.manage");

  const [preset, setPreset] = useState(TEMP_PRESETS[0].label);
  const [temp, setTemp] = useState("");
  const [outletId, setOutletId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const active = TEMP_PRESETS.find((p) => p.label === preset) ?? TEMP_PRESETS[0];

  const submit = async () => {
    const t = Number(temp);
    if (!Number.isFinite(t)) { toast.error("Enter a temperature"); return; }
    setSaving(true);
    try {
      await log({
        outlet_id: outletId || null,
        equipment_label: active.label,
        temp_f: t,
        min_f: active.min,
        max_f: active.max,
      });
      setTemp("");
      toast.success(
        t < active.min || t > active.max
          ? `Recorded ${t}°F — outside the safe range, please act on it`
          : `Recorded ${t}°F`
      );
    } catch {
      toast.error("Couldn't save that reading");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="glass-card p-4">
          <p className="text-sm font-semibold text-foreground mb-3">Record a reading</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Equipment</span>
              <select
                value={preset} onChange={(e) => setPreset(e.target.value)}
                className="mt-1 w-full h-9 rounded-lg bg-foreground/[0.04] border border-border px-2 text-sm text-foreground"
              >
                {TEMP_PRESETS.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Outlet</span>
              <select
                value={outletId} onChange={(e) => setOutletId(e.target.value)}
                className="mt-1 w-full h-9 rounded-lg bg-foreground/[0.04] border border-border px-2 text-sm text-foreground"
              >
                <option value="">—</option>
                {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Temp °F <span className="text-muted-foreground/70">(safe {active.min}–{active.max})</span>
              </span>
              <Input
                type="number" step="any" value={temp}
                onChange={(e) => setTemp(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                placeholder="38"
                className="mt-1 h-9"
              />
            </label>
            <div className="flex items-end">
              <Button onClick={submit} disabled={saving || temp === ""} className="w-full">
                <Plus className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Log reading"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card p-5">
        <p className="text-sm font-semibold text-foreground mb-3">Recent readings</p>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-10 rounded bg-foreground/[0.04] animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Thermometer}
            title="No readings logged yet"
            description="Record cooler and hot-holding temperatures here to keep an auditable food-safety trail."
            hint="Readings can't be edited once saved — that's what makes the log worth keeping."
            compact
          />
        ) : (
          <div className="space-y-1.5">
            {logs.map((l) => (
              <div key={l.id} className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2",
                l.in_range ? "border-border bg-foreground/[0.02]" : "border-red-500/30 bg-red-500/[0.06]"
              )}>
                {l.in_range
                  ? <CircleCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  : <TriangleAlert className="h-4 w-4 text-red-400 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{l.equipment_label}</p>
                  {l.note && <p className="text-[11px] text-muted-foreground truncate">{l.note}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={cn("text-sm font-semibold tabular-nums", l.in_range ? "text-foreground" : "text-red-400")}>
                    {l.temp_f}°F
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    safe {l.min_f}–{l.max_f}
                  </p>
                </div>
                <div className="text-right shrink-0 hidden sm:block w-28">
                  <p className="text-[11px] text-muted-foreground truncate">{l.logger?.full_name ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground/70">
                    {formatDistanceToNow(new Date(l.created_at))} ago
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
