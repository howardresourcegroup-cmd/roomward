"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import type { FnbOutlet, FnbUnit } from "@/types";

const UNITS: FnbUnit[] = ["each", "case", "lb", "kg", "liter", "gallon", "bottle"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outlets: FnbOutlet[];
  onCreate: (input: {
    name: string; outlet_id?: string | null; category?: string | null;
    unit: FnbUnit; on_hand: number; par_level: number;
    unit_cost_cents?: number | null; supplier?: string | null;
  }) => Promise<void>;
}

const field = "mt-1 w-full h-9 rounded-lg bg-foreground/[0.04] border border-border px-2 text-sm text-foreground";

export function InventoryForm({ open, onOpenChange, outlets, onCreate }: Props) {
  const [name, setName] = useState("");
  const [outletId, setOutletId] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState<FnbUnit>("each");
  const [onHand, setOnHand] = useState("");
  const [par, setPar] = useState("");
  const [cost, setCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(""); setOutletId(""); setCategory(""); setUnit("each");
    setOnHand(""); setPar(""); setCost(""); setSupplier("");
  };

  const submit = async () => {
    const nOnHand = Number(onHand);
    const nPar = Number(par);
    if (!name.trim()) { toast.error("Give the item a name"); return; }
    if (!Number.isFinite(nOnHand) || nOnHand < 0) { toast.error("On-hand must be zero or more"); return; }
    if (!Number.isFinite(nPar) || nPar < 0) { toast.error("Par level must be zero or more"); return; }

    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        outlet_id: outletId || null,
        category: category.trim() || null,
        unit,
        on_hand: nOnHand,
        par_level: nPar,
        // Cost is entered in dollars; stored in cents.
        unit_cost_cents: cost.trim() === "" ? null : Math.round(Number(cost) * 100),
        supplier: supplier.trim() || null,
      });
      toast.success(`${name.trim()} added`);
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add that item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a stock line</DialogTitle>
          <DialogDescription>
            Set a par level and the item shows up on the reorder list whenever it drops to it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Item</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Whole milk" className="mt-1 h-9" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Outlet</span>
              <select value={outletId} onChange={(e) => setOutletId(e.target.value)} className={field}>
                <option value="">—</option>
                {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Unit</span>
              <select value={unit} onChange={(e) => setUnit(e.target.value as FnbUnit)} className={field}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">On hand</span>
              <Input type="number" min={0} step="any" value={onHand} onChange={(e) => setOnHand(e.target.value)} placeholder="12" className="mt-1 h-9" />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Par level</span>
              <Input type="number" min={0} step="any" value={par} onChange={(e) => setPar(e.target.value)} placeholder="20" className="mt-1 h-9" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Category <span className="text-muted-foreground/60">(opt.)</span></span>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="dairy" className="mt-1 h-9" />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Unit cost $ <span className="text-muted-foreground/60">(opt.)</span></span>
              <Input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="4.80" className="mt-1 h-9" />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Supplier <span className="text-muted-foreground/60">(optional)</span></span>
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Sysco" className="mt-1 h-9" />
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving || !name.trim()}>
            {saving ? "Adding…" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
