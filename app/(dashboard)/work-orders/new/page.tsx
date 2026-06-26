"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createWorkOrder, fetchSpace } from "@/lib/data/queries";
import { useProfiles, useCurrentProfile } from "@/lib/data/hooks";
import type { WorkOrderPriority, Space } from "@/types";

const CATEGORIES = [
  "General", "HVAC", "Plumbing", "Electrical", "Network / IT",
  "Elevator", "Housekeeping", "Grounds", "Carpentry", "Inspection", "Other",
];

export default function NewWorkOrderPage() {
  const router = useRouter();
  const { profiles } = useProfiles();
  const me = useCurrentProfile();
  const [form, setForm] = useState({
    title: "", description: "", priority: "medium" as WorkOrderPriority,
    category: "General", location: "", assigned_to: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [linkedSpace, setLinkedSpace] = useState<Space | null>(null);

  // Pre-fill from query params: ?assignee= (Technicians) and ?space= (floor plan).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const a = sp.get("assignee");
    if (a) setForm((f) => ({ ...f, assigned_to: a }));
    const space = sp.get("space");
    if (space) fetchSpace(space).then((s) => s && setLinkedSpace(s)).catch(() => {});
  }, []);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !me) return;
    setSaving(true);
    setError("");

    const assignee = profiles.find((p) =>
      form.assigned_to && p.full_name.toLowerCase().includes(form.assigned_to.toLowerCase())
    );

    try {
      await createWorkOrder({
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        category: form.category.toLowerCase().replace(/ \/ /g, "_").replace(/ /g, "_"),
        space_id: linkedSpace?.id ?? null,
        assigned_to: assignee?.id ?? null,
        organization_id: me.organization_id!,
        created_by: me.id,
      });
      router.push("/work-orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create work order");
      setSaving(false);
    }
  };

  const pColor: Record<WorkOrderPriority, string> = {
    low: "text-muted-foreground", medium: "text-blue-400", high: "text-orange-400", critical: "text-red-400",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/20">
          <ClipboardList className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">New Work Order</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Document an issue and dispatch your team.</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Issue Title *</Label>
            <Input
              id="title"
              placeholder="e.g. AC not cooling in Room 204"
              value={form.title}
              onChange={(e) => set("title")(e.target.value)}
              required className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              placeholder="What did you observe? Guest complaint? Equipment reading? More detail = faster resolution."
              rows={4}
              value={form.description}
              onChange={(e) => set("description")(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority")(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["low", "medium", "high", "critical"] as WorkOrderPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className={pColor[p] + " font-medium capitalize"}>{p}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={set("category")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {linkedSpace ? (
            <div className="space-y-1.5">
              <Label>Location</Label>
              <div className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 h-10 text-sm text-indigo-300">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">{linkedSpace.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  This room&apos;s status will update automatically
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Room 204, Cabin 3, Kitchen, Trail Head…"
                value={form.location}
                onChange={(e) => set("location")(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="assign">Assign To (optional)</Label>
            <Input
              id="assign"
              placeholder="Technician name"
              value={form.assigned_to}
              onChange={(e) => set("assigned_to")(e.target.value)}
              list="tech-list"
            />
            <datalist id="tech-list">
              {profiles.map((p) => <option key={p.id} value={p.full_name} />)}
            </datalist>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saving || !form.title.trim()} size="lg">
              <ClipboardList className="h-4 w-4" />
              {saving ? "Creating…" : "Create Work Order"}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
