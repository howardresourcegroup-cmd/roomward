import { describe, it, expect } from "vitest";
import {
  RM_STATUS_MAP,
  FF_TO_RM,
  mapRoomMasterStatus,
  ffStatusToRmCode,
} from "./roommaster";
import type { SpaceStatus } from "@/types";

describe("mapRoomMasterStatus", () => {
  it("maps each known RoomMaster code to the documented status", () => {
    expect(mapRoomMasterStatus("1")).toEqual({ ff_status: "operational", create_wo: false }); // Clean
    expect(mapRoomMasterStatus("2")).toEqual({ ff_status: "cleaning_required", create_wo: true }); // Dirty
    expect(mapRoomMasterStatus("4")).toEqual({ ff_status: "offline", create_wo: true }); // Out of Service
    expect(mapRoomMasterStatus("9")).toEqual({ ff_status: "needs_maintenance", create_wo: true }); // Maintenance
  });

  it("only flags actionable statuses for work-order creation", () => {
    // Clean / Inspected / DND / Occupied Clean should never create a WO
    for (const code of ["1", "3", "5", "7"]) {
      expect(mapRoomMasterStatus(code).create_wo).toBe(false);
    }
    // Dirty / Out of Service / Occupied Dirty / Pickup / Maintenance should
    for (const code of ["2", "4", "6", "8", "9"]) {
      expect(mapRoomMasterStatus(code).create_wo).toBe(true);
    }
  });

  it("defaults unknown codes to operational with no work order", () => {
    expect(mapRoomMasterStatus("999")).toEqual({ ff_status: "operational", create_wo: false });
    expect(mapRoomMasterStatus("")).toEqual({ ff_status: "operational", create_wo: false });
  });
});

describe("ffStatusToRmCode", () => {
  it("maps each Roomward status to a RoomMaster code", () => {
    expect(ffStatusToRmCode("operational")).toBe("1");
    expect(ffStatusToRmCode("cleaning_required")).toBe("2");
    expect(ffStatusToRmCode("needs_maintenance")).toBe("9");
    expect(ffStatusToRmCode("offline")).toBe("4");
    expect(ffStatusToRmCode("inspection_due")).toBe("8");
    expect(ffStatusToRmCode("emergency")).toBe("4"); // closest equivalent
  });

  it("covers every SpaceStatus in the FF_TO_RM table", () => {
    const statuses: SpaceStatus[] = [
      "operational", "needs_maintenance", "offline",
      "cleaning_required", "inspection_due", "emergency",
    ];
    for (const s of statuses) {
      expect(FF_TO_RM[s]).toBeDefined();
      expect(RM_STATUS_MAP[FF_TO_RM[s]]).toBeDefined(); // round-trips to a real code
    }
  });
});
