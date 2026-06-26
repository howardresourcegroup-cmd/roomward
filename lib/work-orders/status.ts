// Pure logic: what room status does a new work order imply? No I/O, testable.
// Used when a work order is created against a room so the floor plan reflects the
// issue automatically.

import type { SpaceStatus, WorkOrderPriority } from "@/types";

// Given the room's CURRENT status, the new work order's priority and category,
// return the status to apply — or null to leave the room alone.
//
// "if not already": we only auto-flag a room that is currently operational. If a
// room already shows a problem state, we never override it (a new low-priority
// order shouldn't downgrade an existing emergency).
export function deriveSpaceStatusFromWorkOrder(
  current: SpaceStatus,
  priority: WorkOrderPriority,
  category: string,
): SpaceStatus | null {
  if (current !== "operational") return null;

  const cat = (category ?? "").toLowerCase();
  if (cat.includes("housekeep") || cat.includes("clean")) return "cleaning_required";
  if (cat.includes("inspection")) return "inspection_due";
  if (priority === "critical") return "emergency";
  return "needs_maintenance";
}
