"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Layers, Grid3x3, AlertTriangle, ArrowRight, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { updateBuilding, deleteBuilding } from "@/lib/data/queries";
import type { Building } from "@/types";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, string> = {
  hotel: "🏨", lodge: "🏕️", resort: "🌴", inn: "🛎️",
  office: "🏢", hospital: "🏥", school: "🏫", retail: "🏬", warehouse: "🏭",
};

interface BuildingCardProps {
  building: Building;
  index?: number;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, patch: Partial<Building>) => void;
  canManage?: boolean;
}

export function BuildingCard({ building, index = 0, onDelete, onUpdate, canManage }: BuildingCardProps) {
  const issueCount = building._issue_count ?? 0;
  const emergencyCount = building._emergency_count ?? 0;
  const hasIssues = issueCount > 0;
  const hasEmergency = emergencyCount > 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: "easeOut" }}
      className="relative group/card"
    >
      {canManage && (
        <div className="absolute top-3 right-3 z-10">
          <div className="relative">
            <Button
              size="icon" variant="ghost"
              className="h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity"
              onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(o => !o); }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-30 w-36 rounded-xl bg-card border border-border shadow-xl py-1 text-sm">
                  <button
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-foreground hover:text-foreground hover:bg-foreground/[0.06]"
                    onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />Edit
                  </button>
                  <button
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Link
        href={`/buildings/${building.id}`}
        className="block glass-card p-5 hover:border-border hover:bg-card transition-all duration-200"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/[0.04] border border-border text-xl">
              {TYPE_ICONS[building.type] ?? "🏢"}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground group-hover/card:text-white transition-colors line-clamp-1">
                {building.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {building.city}, {building.state}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover/card:text-muted-foreground group-hover/card:translate-x-1 transition-all" />
        </div>

        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Layers className="h-3 w-3" />
            {building._floor_count ?? 0} floors
          </span>
          <span className="flex items-center gap-1.5">
            <Grid3x3 className="h-3 w-3" />
            {building._space_count ?? 0} spaces
          </span>
        </div>

        <div className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border",
          hasEmergency
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : hasIssues
            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        )}>
          {hasEmergency ? (
            <>
              <AlertTriangle className="h-3 w-3 animate-pulse" />
              {emergencyCount} emergenc{emergencyCount !== 1 ? "ies" : "y"}
              {issueCount > emergencyCount && ` · ${issueCount - emergencyCount} other issue${issueCount - emergencyCount !== 1 ? "s" : ""}`}
            </>
          ) : hasIssues ? (
            <><AlertTriangle className="h-3 w-3" />{issueCount} active issue{issueCount !== 1 ? "s" : ""}</>
          ) : (
            <><span className="h-2 w-2 rounded-full bg-emerald-400" />All systems operational</>
          )}
        </div>
      </Link>

      {editOpen && (
        <EditBuildingModal
          building={building}
          onClose={() => setEditOpen(false)}
          onSaved={(patch) => { onUpdate?.(building.id, patch); setEditOpen(false); }}
        />
      )}

      {confirmDelete && (
        <Dialog open onOpenChange={() => setConfirmDelete(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Delete {building.name}?</DialogTitle></DialogHeader>
            <p className="px-6 text-sm text-muted-foreground">
              This permanently removes the building, all floors, rooms, and associated data. This cannot be undone.
            </p>
            <DialogFooter className="px-6 pb-4 gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try { await deleteBuilding(building.id); onDelete?.(building.id); setConfirmDelete(false); }
                  catch { toast.error("Couldn't delete the building. Please try again."); }
                  setDeleting(false);
                }}
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete building
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
}

function EditBuildingModal({ building, onClose, onSaved }: {
  building: Building;
  onClose: () => void;
  onSaved: (patch: Partial<Building>) => void;
}) {
  const [form, setForm] = useState({
    name: building.name,
    city: building.city ?? "",
    state: building.state ?? "",
    address: building.address ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try { await updateBuilding(building.id, form); onSaved(form); }
    catch { toast.error("Couldn't save changes. Please try again."); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit building</DialogTitle></DialogHeader>
        <form onSubmit={save}>
          <div className="px-6 pb-2 space-y-3">
            {([
              { label: "Name *", key: "name", placeholder: "Main Lodge" },
              { label: "Address", key: "address", placeholder: "123 Resort Dr" },
              { label: "City", key: "city", placeholder: "Dawsonville" },
              { label: "State", key: "state", placeholder: "GA" },
            ] as { label: string; key: keyof typeof form; placeholder: string }[]).map(({ label, key, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{label}</label>
                <Input
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
