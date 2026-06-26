export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/server/auth";
import type { SpaceStatus } from "@/types";
import { RM_STATUS_MAP, mapRoomMasterStatus, ffStatusToRmCode } from "@/lib/integrations/roommaster";

// ─── Mock RoomMaster room data ─────────────────────────────────────────────
const MOCK_RM_ROOMS = [
  { room: "201", rm_status: "7", rm_label: "Occupied Clean",   space_id: "s-201" },
  { room: "202", rm_status: "6", rm_label: "Occupied Dirty",   space_id: "s-202" },
  { room: "203", rm_status: "3", rm_label: "Inspected",        space_id: "s-203" },
  { room: "204", rm_status: "9", rm_label: "Maintenance",      space_id: "s-204" },
  { room: "205", rm_status: "7", rm_label: "Occupied Clean",   space_id: "s-205" },
  { room: "206", rm_status: "2", rm_label: "Dirty",            space_id: "s-206" },
  { room: "207", rm_status: "1", rm_label: "Clean",            space_id: "s-207" },
  { room: "208", rm_status: "7", rm_label: "Occupied Clean",   space_id: "s-208" },
  { room: "209", rm_status: "4", rm_label: "Out of Service",   space_id: "s-209" },
  { room: "210", rm_status: "1", rm_label: "Clean",            space_id: "s-210" },
  { room: "211", rm_status: "8", rm_label: "Pickup",           space_id: "s-211" },
  { room: "212", rm_status: "8", rm_label: "Pickup",           space_id: "s-212" },
  { room: "213", rm_status: "1", rm_label: "Clean",            space_id: "s-213" },
  { room: "214", rm_status: "5", rm_label: "Do Not Disturb",   space_id: "s-214" },
  { room: "301", rm_status: "1", rm_label: "Clean",            space_id: "s-301" },
  { room: "302", rm_status: "7", rm_label: "Occupied Clean",   space_id: "s-302" },
  { room: "303", rm_status: "2", rm_label: "Dirty",            space_id: "s-303" },
  { room: "304", rm_status: "7", rm_label: "Occupied Clean",   space_id: "s-304" },
  { room: "305", rm_status: "1", rm_label: "Clean",            space_id: "s-305" },
  { room: "306", rm_status: "4", rm_label: "Out of Service",   space_id: "s-306" },
  { room: "307", rm_status: "5", rm_label: "Do Not Disturb",   space_id: "s-307" },
];

// GET — pull current room statuses from RoomMaster
export async function GET(request: NextRequest) {
  if (!(await getAuthedUser(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";

  const rooms = MOCK_RM_ROOMS.map((r) => {
    const mapping = mapRoomMasterStatus(r.rm_status);
    return {
      room_number: r.room,
      pms_status: r.rm_label,
      pms_status_code: r.rm_status,
      ff_status: mapping.ff_status,
      space_id: r.space_id,
      space_name: `Room ${r.room}`,
      create_work_order: mapping.create_wo,
    };
  });

  if (format === "xml") {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<RoomMasterExport timestamp="${new Date().toISOString()}" property="AMICALOLA">
  <Rooms>
${rooms.map((r) => `    <Room number="${r.room_number}" status="${r.pms_status_code}" statusLabel="${r.pms_status}" />`).join("\n")}
  </Rooms>
</RoomMasterExport>`;
    return new NextResponse(xml, { headers: { "Content-Type": "application/xml" } });
  }

  return NextResponse.json({
    provider: "RoomMaster by IQware",
    property_code: "AMICALOLA",
    synced_at: new Date().toISOString(),
    total_rooms: rooms.length,
    rooms,
  });
}

// POST — full sync pull OR push a status change back to RoomMaster
export async function POST(request: NextRequest) {
  if (!(await getAuthedUser(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "sync";

  const body = await request.json().catch(() => ({}));

  // ── Push: Roomward → RoomMaster ───────────────────────────────────────
  // Called when a technician changes a room's status in Roomward.
  // In production: replace the mock response with a real HTTP call to
  // RoomMaster's API endpoint:
  //   POST https://<property>.roommaster.com/api/rooms/{room}/status
  //   Authorization: Bearer <RM_API_TOKEN>
  //   Body: { "statusCode": "1" }
  if (action === "push") {
    const { room_number, ff_status } = body as { room_number?: string; ff_status?: SpaceStatus };
    if (!room_number || !ff_status) {
      return NextResponse.json({ error: "room_number and ff_status required" }, { status: 400 });
    }

    const rm_code = ffStatusToRmCode(ff_status);

    // TODO in production: call real RoomMaster API here
    // const rmRes = await fetch(`${process.env.RM_API_URL}/rooms/${room_number}/status`, {
    //   method: "POST",
    //   headers: { Authorization: `Bearer ${process.env.RM_API_TOKEN}`, "Content-Type": "application/json" },
    //   body: JSON.stringify({ statusCode: rm_code }),
    // });

    return NextResponse.json({
      pushed: true,
      room_number,
      ff_status,
      rm_status_code: rm_code,
      rm_status_label: Object.entries(RM_STATUS_MAP).find(([k]) => k === rm_code)?.[1] ?? "Unknown",
      pushed_at: new Date().toISOString(),
    });
  }

  // ── Webhook: single room update from RoomMaster ───────────────────────────
  if (action === "webhook") {
    const { room_number, status_code, status_label } = body as {
      room_number?: string; status_code?: string; status_label?: string;
    };
    if (!room_number || !status_code) {
      return NextResponse.json({ error: "Missing room_number or status_code" }, { status: 400 });
    }
    const rm  = MOCK_RM_ROOMS.find((r) => r.room === room_number);
    const map = mapRoomMasterStatus(status_code);
    return NextResponse.json({
      received: true, room_number,
      pms_status: status_label ?? status_code,
      ff_status: map.ff_status,
      space_id: rm?.space_id ?? null,
      create_work_order: map.create_wo,
      processed_at: new Date().toISOString(),
    });
  }

  // ── Full sync pull ────────────────────────────────────────────────────────
  const rooms = MOCK_RM_ROOMS.map((r) => {
    const mapping = mapRoomMasterStatus(r.rm_status);
    return {
      room_number: r.room,
      pms_status: r.rm_label,
      ff_status: mapping.ff_status,
      space_id: r.space_id,
      space_name: `Room ${r.room}`,
      create_work_order: mapping.create_wo,
    };
  });

  return NextResponse.json({
    success: true,
    synced_at: new Date().toISOString(),
    total_rooms: rooms.length,
    changes: rooms,
    work_orders_created: rooms.filter((r) => r.create_work_order).length,
  });
}
