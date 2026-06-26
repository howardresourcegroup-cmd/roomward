// Pure RoomMaster (IQware PMS) status mapping — no I/O, fully testable.
// The API route ([app/api/roommaster/route.ts]) imports these so the mapping
// logic lives in one place and can be unit-tested without a server.

import type { SpaceStatus } from "@/types";

export interface RmMapping {
  ff_status: SpaceStatus;
  create_wo: boolean;
}

// RoomMaster status code → Roomward space status (+ whether to auto-create a work order)
export const RM_STATUS_MAP: Record<string, RmMapping> = {
  "1": { ff_status: "operational",       create_wo: false }, // Clean
  "2": { ff_status: "cleaning_required", create_wo: true  }, // Dirty
  "3": { ff_status: "operational",       create_wo: false }, // Inspected
  "4": { ff_status: "offline",           create_wo: true  }, // Out of Service
  "5": { ff_status: "operational",       create_wo: false }, // Do Not Disturb
  "6": { ff_status: "cleaning_required", create_wo: true  }, // Occupied Dirty
  "7": { ff_status: "operational",       create_wo: false }, // Occupied Clean
  "8": { ff_status: "inspection_due",    create_wo: true  }, // Pickup
  "9": { ff_status: "needs_maintenance", create_wo: true  }, // Maintenance
};

// Roomward space status → RoomMaster status code (for pushing changes back)
export const FF_TO_RM: Record<SpaceStatus, string> = {
  operational:       "1", // Clean
  cleaning_required: "2", // Dirty
  needs_maintenance: "9", // Maintenance
  offline:           "4", // Out of Service
  inspection_due:    "8", // Pickup
  emergency:         "4", // Out of Service (closest equivalent)
};

const DEFAULT_MAPPING: RmMapping = { ff_status: "operational", create_wo: false };

// Map an inbound RoomMaster status code; unknown codes default to operational.
export function mapRoomMasterStatus(code: string): RmMapping {
  return RM_STATUS_MAP[code] ?? DEFAULT_MAPPING;
}

// Map a Roomward status to a RoomMaster code; unknown statuses default to Clean.
export function ffStatusToRmCode(status: SpaceStatus): string {
  return FF_TO_RM[status] ?? "1";
}
