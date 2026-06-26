"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Plus, Wrench, AlertTriangle, CheckCircle2, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useAssets, usePermissions } from "@/lib/data/hooks";
import { createAsset, deleteAsset } from "@/lib/data/queries";
import type { Asset, AssetStatus } from "@/types";

const STATUS_STYLES: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
  operational: { label: "Operational",    variant: "success" },
  maintenance: { label: "In Maintenance", variant: "warning" },
  degraded:    { label: "Degraded",       variant: "warning" },
  failed:      { label: "Failed",         variant: "danger" },
};

const TYPES = ["HVAC", "Plumbing", "Electrical", "Kitchen", "Elevator", "Pool", "Security", "Laundry", "Other"];

export default function AssetsPage() {
  const { assets, loading, reload } = useAssets();
  const { can } = usePermissions();
  const [showCreate, setShowCreate] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const counts = {
    total:       assets.length,
    operational: assets.filter((a) => a.status === "operational").length,
    attention:   assets.filter((a) => a.status !== "operational").length,
    overdue:     assets.filter((a) => a.next_maintenance_at && new Date(a.next_maintenance_at) < new Date()).length,
  };

  const confirmRemove = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try { await deleteAsset(pendingDelete.id); reload(); setPendingDelete(null); }
    catch { toast.error("Couldn't remove the asset. Please try again."); }
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.total} tracked · {counts.operational} operational
            {counts.attention > 0 && <span className="text-amber-400"> · {counts.attention} need attention</span>}
            {counts.overdue > 0 && <span className="text-red-400"> · {counts.overdue} service overdue</span>}
          </p>
        </div>
        {can("assets.manage") && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Assets",    value: counts.total,       icon: Package,       color: "text-indigo-400",  bg: "bg-indigo-500/15" },
          { label: "Operational",     value: counts.operational, icon: CheckCircle2,  color: "text-emerald-400", bg: "bg-emerald-500/15" },
          { label: "Need Attention",  value: counts.attention,   icon: AlertTriangle, color: "text-amber-400",   bg: "bg-amber-500/15" },
          { label: "Service Overdue", value: counts.overdue,     icon: Calendar,      color: "text-red-400",     bg: "bg-red-500/15" },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="glass-card p-4 flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-card h-64 shimmer" />
      ) : assets.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No assets yet"
          description="Track equipment to monitor health and schedule preventive maintenance."
          action={can("assets.manage") ? { label: "Add Asset", onClick: () => setShowCreate(true) } : undefined}
        />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Asset", "Type", "Location", "Status", "Model / Serial", "Next Service", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map((asset, i) => {
                  const s = STATUS_STYLES[asset.status] ?? STATUS_STYLES.operational;
                  const overdue = asset.next_maintenance_at ? new Date(asset.next_maintenance_at) < new Date() : false;
                  return (
                    <motion.tr key={asset.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-border hover:bg-foreground/[0.03] transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-foreground font-medium">{asset.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{asset.type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{(asset as Asset & { space?: { name: string } }).space?.name ?? "—"}</td>
                      <td className="px-4 py-3"><Badge variant={s.variant}>{s.label}</Badge></td>
                      <td className="px-4 py-3">
                        <p className="text-muted-foreground">{asset.model ?? "—"}</p>
                        {asset.serial_number && <p className="text-xs text-muted-foreground font-mono">{asset.serial_number}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={overdue ? "text-red-400 font-medium" : "text-muted-foreground"}>
                          {asset.next_maintenance_at
                            ? new Date(asset.next_maintenance_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {can("assets.manage") && (
                          <button onClick={() => setPendingDelete(asset)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateAssetModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={reload} />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={`Remove ${pendingDelete?.name ?? "asset"}?`}
        description="This removes the asset and its maintenance history. This cannot be undone."
        confirmLabel="Remove asset"
        destructive
        loading={deleting}
        onConfirm={confirmRemove}
      />
    </div>
  );
}

function CreateAssetModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", type: "HVAC", model: "", serial_number: "", status: "operational" as AssetStatus, next: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createAsset({
        name: form.name.trim(), type: form.type, model: form.model.trim() || null,
        serial_number: form.serial_number.trim() || null, status: form.status,
        next_maintenance_at: form.next ? new Date(form.next).toISOString() : null,
      });
      onCreated(); onClose();
      setForm({ name: "", type: "HVAC", model: "", serial_number: "", status: "operational", next: "" });
    } catch { toast.error("Couldn't add the asset. Please try again."); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Asset</DialogTitle></DialogHeader>
        <form onSubmit={submit}>
          <div className="px-6 pb-2 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Asset Name *</label>
              <Input value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="e.g. HVAC Unit 3" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Type</label>
                <Select value={form.type} onValueChange={set("type")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={(v) => set("status")(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_STYLES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Model</label>
                <Input value={form.model} onChange={(e) => set("model")(e.target.value)} placeholder="Carrier 50XC" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Serial No.</label>
                <Input value={form.serial_number} onChange={(e) => set("serial_number")(e.target.value)} placeholder="CC-0001" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Next Service Date</label>
              <Input type="date" value={form.next} onChange={(e) => set("next")(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>{saving ? "Adding…" : "Add Asset"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
