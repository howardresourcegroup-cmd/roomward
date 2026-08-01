"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import type { OutletKind } from "@/types";

const KINDS: { value: OutletKind; label: string }[] = [
  { value: "restaurant",      label: "Restaurant" },
  { value: "bar",             label: "Bar" },
  { value: "cafe",            label: "Café" },
  { value: "room_service",    label: "Room service" },
  { value: "banquet_kitchen", label: "Banquet kitchen" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    name: string; kind: OutletKind;
    opens_at?: string | null; closes_at?: string | null;
    seats?: number | null; notes?: string | null;
  }) => Promise<void>;
}

const field = "mt-1 w-full h-9 rounded-lg bg-foreground/[0.04] border border-border px-2 text-sm text-foreground";

export function OutletForm({ open, onOpenChange, onCreate }: Props) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<OutletKind>("restaurant");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [seats, setSeats] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(""); setKind("restaurant"); setOpensAt(""); setClosesAt("");
    setSeats(""); setNotes("");
  };

  const submit = async () => {
    if (!name.trim()) { toast.error("Give the outlet a name"); return; }
    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        kind,
        opens_at: opensAt || null,
        closes_at: closesAt || null,
        // Blank stays null rather than becoming 0 — "unknown" and "no seats" are
        // different things, and room service genuinely has none.
        seats: seats.trim() === "" ? null : Number(seats),
        notes: notes.trim() || null,
      });
      toast.success(`${name.trim()} added`);
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add that outlet");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add an outlet</DialogTitle>
          <DialogDescription>
            A restaurant, bar, café or kitchen. Each one gets its own stock list and temperature log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Riverside Grill" className="mt-1 h-9" />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Type</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as OutletKind)} className={field}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Opens</span>
              <Input type="time" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="mt-1 h-9" />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Closes</span>
              <Input type="time" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="mt-1 h-9" />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Seats <span className="text-muted-foreground/60">(optional)</span></span>
            <Input type="number" min={0} value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="84" className="mt-1 h-9" />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Notes <span className="text-muted-foreground/60">(optional)</span></span>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Closes early in bad weather" className="mt-1 h-9" />
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving || !name.trim()}>
            {saving ? "Adding…" : "Add outlet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
