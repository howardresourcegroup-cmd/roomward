import { describe, it, expect } from "vitest";
import { deriveSpaceStatusFromWorkOrder } from "./status";

describe("deriveSpaceStatusFromWorkOrder", () => {
  it("flags an operational room as needs_maintenance for a normal order", () => {
    expect(deriveSpaceStatusFromWorkOrder("operational", "medium", "HVAC")).toBe("needs_maintenance");
    expect(deriveSpaceStatusFromWorkOrder("operational", "high", "Plumbing")).toBe("needs_maintenance");
  });

  it("escalates a critical order to emergency", () => {
    expect(deriveSpaceStatusFromWorkOrder("operational", "critical", "Electrical")).toBe("emergency");
  });

  it("uses cleaning_required for housekeeping categories", () => {
    expect(deriveSpaceStatusFromWorkOrder("operational", "low", "Housekeeping")).toBe("cleaning_required");
    expect(deriveSpaceStatusFromWorkOrder("operational", "medium", "deep clean")).toBe("cleaning_required");
  });

  it("uses inspection_due for inspection categories", () => {
    expect(deriveSpaceStatusFromWorkOrder("operational", "medium", "Inspection")).toBe("inspection_due");
  });

  it("leaves a room alone if it already shows a problem (if not already)", () => {
    for (const s of ["needs_maintenance", "offline", "cleaning_required", "inspection_due", "emergency"] as const) {
      expect(deriveSpaceStatusFromWorkOrder(s, "critical", "HVAC")).toBeNull();
    }
  });
});
