// Roomward — Supabase seed script
// Seeds the Grandview Falls demo org with real, database-backed data.
//
// Run locally (your service_role key stays on your machine):
//   1. Add to .env.local:
//        NEXT_PUBLIC_SUPABASE_URL=https://upbzutjlzfrzqpcuagmh.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY=<your service_role / secret key>
//   2. node --env-file=.env.local scripts/seed.mjs
//
// Idempotent: it wipes the demo org's data and re-seeds. Safe to re-run.
// To remove the demo entirely before onboarding a real client, run with: --wipe

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error("✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("  Add them to .env.local, then run: node --env-file=.env.local scripts/seed.mjs");
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const ORG_ID = "00000000-0000-0000-0000-0000000000a1";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "RoomwardDemo2026";

// ─── Team ─────────────────────────────────────────────────────────────────────
// `role` = legacy text (drives coarse RLS: only manager/admin manage).
// `roleSlug` = which configured role to link (drives role-tailored dashboards).
const TEAM = [
  { email: "manager@grandviewdemo.com", name: "Sarah Mitchell", role: "manager",    roleSlug: "manager",      phone: "706-265-0200", available: true,  login: true },
  { email: "marcus@grandviewdemo.com",  name: "Marcus Webb",    role: "technician", roleSlug: "maintenance",  phone: "706-265-0101", available: false, login: false },
  { email: "priya@grandviewdemo.com",   name: "Priya Patel",    role: "technician", roleSlug: "maintenance",  phone: "706-265-0102", available: true,  login: false },
  { email: "james@grandviewdemo.com",   name: "James Okafor",   role: "technician", roleSlug: "maintenance",  phone: "706-265-0103", available: true,  login: false },
  { email: "sofia@grandviewdemo.com",   name: "Sofia Reyes",    role: "technician", roleSlug: "housekeeping", phone: "706-265-0104", available: false, login: false },
  { email: "chen@grandviewdemo.com",    name: "Chen Wei",       role: "technician", roleSlug: "front_desk",   phone: "706-265-0105", available: true,  login: false },
];

// ─── Buildings & floors ───────────────────────────────────────────────────────
const BUILDINGS = [
  { key: "b1", name: "Grandview Lodge",       type: "hotel", address: "1 Lakeshore Drive", city: "Lake Haven", state: "GA" },
  { key: "b2", name: "Pine Ridge Cabins",        type: "hotel", address: "1 Lakeshore Drive", city: "Lake Haven", state: "GA" },
  { key: "b3", name: "Recreation Center", type: "hotel", address: "1 Lakeshore Drive", city: "Lake Haven", state: "GA" },
];
const FLOORS = [
  { key: "f1", building: "b1", name: "Ground Floor", level: 1, cols: 14, rows: 7 },
  { key: "f2", building: "b1", name: "Floor 2",      level: 2, cols: 14, rows: 7 },
  { key: "f3", building: "b1", name: "Floor 3",      level: 3, cols: 14, rows: 7 },
  { key: "f4", building: "b2", name: "Cabin Grounds",level: 1, cols: 12, rows: 6 },
  { key: "f5", building: "b3", name: "Main Level",   level: 1, cols: 12, rows: 6 },
];

// ─── Spaces (key = mock id, used to wire work orders) ─────────────────────────
const S = (key, floor, name, type, status, x, y, w, h, notes = null) =>
  ({ key, floor, name, type, status, x, y, w, h, notes });
const SPACES = [
  // Ground
  S("s-lobby","f1","Main Lobby","lobby","operational",1,1,3,3),
  S("s-checkin","f1","Front Desk","office","operational",4,1,2,2),
  S("s-giftshop","f1","Gift Shop","retail","operational",8,1,2,1),
  S("s-atm","f1","ATM / Business Ctr","utility","needs_maintenance",10,1,2,1,"ATM out of cash — service call placed"),
  S("s-restaurant","f1","Maple St. Grille","restaurant","operational",1,4,4,3),
  S("s-kitchen","f1","Kitchen","kitchen","inspection_due",5,4,2,2,"Monthly health inspection due this week"),
  S("s-bar","f1","Terrace Bar","bar","operational",6,2,2,2),
  S("s-mechanical","f1","Mechanical Room","mechanical","needs_maintenance",9,4,2,2,"HVAC unit 2 showing intermittent fault codes"),
  S("s-rest-f-1","f1","Restroom F","restroom","cleaning_required",6,6,1,1),
  // Floor 2
  S("s-201","f2","Room 201","guest_room","operational",1,1,2,2),
  S("s-202","f2","Room 202","guest_room","cleaning_required",3,1,2,2,"Checked out 11am — needs full turnover"),
  S("s-203","f2","Room 203","guest_room","operational",5,1,2,2),
  S("s-204","f2","Room 204","guest_room","needs_maintenance",7,1,2,2,"Guest reported AC not cooling adequately"),
  S("s-205","f2","Room 205","guest_room","operational",9,1,2,2),
  S("s-206","f2","Room 206","guest_room","cleaning_required",11,1,2,2),
  S("s-209","f2","Room 209","guest_room","offline",3,3,2,2,"Out of service — bathroom renovation"),
  S("s-212","f2","Room 212","guest_room","inspection_due",9,3,2,2),
  S("s-214","f2","Falls Suite","suite","operational",13,3,2,2),
  // Floor 3
  S("s-301","f3","Room 301","guest_room","operational",1,1,2,2),
  S("s-303","f3","Room 303","guest_room","cleaning_required",5,1,2,2),
  S("s-306","f3","Room 306","guest_room","emergency",11,1,2,2,"Burst pipe under sink — water shut off to room"),
  S("s-307","f3","Summit Suite","suite","operational",13,1,2,2),
  S("s-conf-a","f3","Blue Ridge Conf. Room","conference","operational",1,3,4,3),
  S("s-spa","f3","Appalachian Spa","spa","operational",11,3,4,2),
  // Cabins
  S("s-c1","f4","Cabin 1 — Bear Creek","cabin","operational",1,1,2,2),
  S("s-c2","f4","Cabin 2 — Deer Run","cabin","cleaning_required",4,1,2,2),
  S("s-c5","f4","Cabin 5 — Hawk Nest","cabin","needs_maintenance",1,4,2,2,"Deck boards rotting — trip hazard"),
  S("s-c8","f4","Cabin 8 — Kudzu Knoll","cabin","offline",10,4,2,2,"Storm damage — awaiting insurance adjuster"),
  // Guest services
  S("s-pool","f5","Outdoor Pool","pool","operational",1,1,3,3),
  S("s-attrail","f5","Pine Ridge Trail","trail","inspection_due",6,1,2,2,"Seasonal inspection before peak season"),
  S("s-visitctr","f5","Visitor Center","lobby","operational",8,1,2,2),
];

// ─── Work orders (space = mock id, assignee/creator = email) ──────────────────
const WO = (title, space, status, priority, category, creator, assignee, desc) =>
  ({ title, space, status, priority, category, creator, assignee, desc });
const WORK_ORDERS = [
  WO("Burst Pipe — Room 306","s-306","in_progress","critical","plumbing","manager@grandviewdemo.com","marcus@grandviewdemo.com","Guest reported water on bathroom floor. Pipe under sink failed. Water shut off. Guest relocated to 308."),
  WO("AC Not Cooling — Room 204","s-204","assigned","high","hvac","manager@grandviewdemo.com","priya@grandviewdemo.com","Guest reports room not reaching set temperature. Thermostat at 78°F despite 68°F setting."),
  WO("HVAC Unit 2 Fault Code","s-mechanical","in_progress","high","hvac","james@grandviewdemo.com","james@grandviewdemo.com","BAS showing fault code E-14 on HVAC unit 2. Cycling on and off. May need capacitor."),
  WO("Deck Boards Rotting — Cabin 5","s-c5","waiting_parts","high","carpentry","manager@grandviewdemo.com","sofia@grandviewdemo.com","Multiple deck boards rotted, two cracked through. Trip hazard. Cabin blocked until repaired."),
  WO("Monthly Health Inspection — Kitchen","s-kitchen","open","medium","inspection","manager@grandviewdemo.com",null,"Monthly food service inspection due this week. All equipment and surfaces inspection-ready."),
  WO("Pre-Season Trail Inspection","s-attrail","open","medium","grounds","manager@grandviewdemo.com","chen@grandviewdemo.com","Annual spring inspection before peak season. Check signage, water bars, footbridge."),
  WO("ATM Out of Cash","s-atm","waiting_parts","low","other","chen@grandviewdemo.com","chen@grandviewdemo.com","ATM empty. Armored car service called — ETA 48 hours."),
];

// ─── Channels & messages ──────────────────────────────────────────────────────
const CHANNELS = [
  { key: "general",      name: "general",      desc: "Team-wide updates" },
  { key: "maintenance",  name: "maintenance",  desc: "Maintenance team channel" },
  { key: "housekeeping", name: "housekeeping", desc: "Housekeeping coordination" },
  { key: "urgent",       name: "urgent",       desc: "Time-sensitive issues only" },
];
const M = (channel, author, body, minsAgo) => ({ channel, author, body, minsAgo });
const MESSAGES = [
  M("general","manager@grandviewdemo.com","Morning team — heads up, Room 306 has a burst pipe. Marcus is on it. Front desk, please hold 308 for the guest relocation.",95),
  M("general","marcus@grandviewdemo.com","On it. Water's shut off to the room. Assessing drywall damage now.",88),
  M("general","priya@grandviewdemo.com","I can cover Marcus's 11am AC check in 204 if needed.",80),
  M("general","manager@grandviewdemo.com","Perfect, thanks Priya.",78),
  M("maintenance","james@grandviewdemo.com","HVAC unit 2 throwing fault code E-14 again. Ordered a replacement capacitor, ETA tomorrow.",60),
  M("housekeeping","manager@grandviewdemo.com","Rooms 202, 206, and 303 flagged dirty in RoomMaster — turnover crew please confirm when done.",40),
];

// ════════════════════════════════════════════════════════════════════════════
async function main() {
  const wipe = process.argv.includes("--wipe");
  console.log(`\n⚡ Roomward seed → ${URL}\n`);

  // 1. Org
  await db.from("organizations").upsert({ id: ORG_ID, name: "Grandview Resort & Lodge", slug: "amicalola-falls", plan: "pro" });
  console.log("✓ Organization");

  // 2. Roles (created by migration 003) → slug→id map for assigning role_id
  const { data: orgRoles } = await db.from("roles").select("id, slug").eq("organization_id", ORG_ID);
  const roleId = Object.fromEntries((orgRoles ?? []).map((r) => [r.slug, r.id]));

  // 3. Users + profiles
  const userIds = {}; // email -> uuid
  const { data: existing } = await db.auth.admin.listUsers({ perPage: 1000 });
  for (const t of TEAM) {
    let user = existing?.users?.find((u) => u.email === t.email);
    if (!user) {
      const { data, error } = await db.auth.admin.createUser({
        email: t.email, password: DEMO_PASSWORD, email_confirm: true,
        user_metadata: { full_name: t.name },
      });
      if (error) { console.error(`  ✖ ${t.email}: ${error.message}`); continue; }
      user = data.user;
    }
    userIds[t.email] = user.id;
    await db.from("profiles").upsert({
      id: user.id, organization_id: ORG_ID, full_name: t.name,
      role: t.role, role_id: roleId[t.roleSlug] ?? null, phone: t.phone, is_available: t.available,
    });
  }
  console.log(`✓ ${Object.keys(userIds).length} team members (login: ${TEAM[0].email} / ${DEMO_PASSWORD})`);

  // wipe demo content for idempotency
  await db.from("messages").delete().eq("organization_id", ORG_ID);
  await db.from("work_orders").delete().eq("organization_id", ORG_ID);
  const { data: bIds } = await db.from("buildings").select("id").eq("organization_id", ORG_ID);
  if (bIds?.length) {
    const { data: fIds } = await db.from("floors").select("id").in("building_id", bIds.map((b) => b.id));
    if (fIds?.length) await db.from("spaces").delete().in("floor_id", fIds.map((f) => f.id));
  }
  await db.from("channels").delete().eq("organization_id", ORG_ID);
  await db.from("floors").delete().in("building_id", (bIds ?? []).map((b) => b.id));
  await db.from("buildings").delete().eq("organization_id", ORG_ID);

  if (wipe) { console.log("\n✓ Wiped demo org. Done."); return; }

  // Demo starts EMPTY of operational data so every visitor experiences building setup.
  // Keep Team Chat channels so that feature isn't bare. Set EMPTY_DEMO=false to seed the
  // full Grandview property instead (useful for a live pitch / full showcase).
  const EMPTY_DEMO = process.env.EMPTY_DEMO !== "false";
  if (EMPTY_DEMO) {
    for (const c of CHANNELS) {
      await db.from("channels").insert({ organization_id: ORG_ID, name: c.name, description: c.desc });
    }
    console.log(`✓ ${CHANNELS.length} chat channels (no buildings/rooms — visitors build the first property)`);
    console.log("\n✅ Demo seeded EMPTY: org + team + roles + channels. Log in and you'll be walked through setup.");
    return;
  }

  // 3. Buildings
  const bMap = {};
  for (const b of BUILDINGS) {
    const { data } = await db.from("buildings").insert({
      organization_id: ORG_ID, name: b.name, type: b.type, address: b.address, city: b.city, state: b.state,
    }).select("id").single();
    bMap[b.key] = data.id;
  }
  console.log(`✓ ${BUILDINGS.length} buildings`);

  // 4. Floors
  const fMap = {};
  for (const f of FLOORS) {
    const { data } = await db.from("floors").insert({
      building_id: bMap[f.building], name: f.name, level: f.level, grid_cols: f.cols, grid_rows: f.rows,
    }).select("id").single();
    fMap[f.key] = data.id;
  }
  console.log(`✓ ${FLOORS.length} floors`);

  // 5. Spaces
  const sMap = {};
  for (const s of SPACES) {
    const { data } = await db.from("spaces").insert({
      floor_id: fMap[s.floor], name: s.name, type: s.type, status: s.status,
      position_x: s.x, position_y: s.y, width: s.w, height: s.h, notes: s.notes,
    }).select("id").single();
    sMap[s.key] = data.id;
  }
  console.log(`✓ ${SPACES.length} spaces`);

  // 6. Work orders
  for (const w of WORK_ORDERS) {
    await db.from("work_orders").insert({
      organization_id: ORG_ID, space_id: sMap[w.space] ?? null,
      created_by: userIds[w.creator], assigned_to: w.assignee ? userIds[w.assignee] : null,
      title: w.title, description: w.desc, status: w.status, priority: w.priority, category: w.category,
    });
  }
  console.log(`✓ ${WORK_ORDERS.length} work orders`);

  // 7. Channels + messages
  const cMap = {};
  for (const c of CHANNELS) {
    const { data } = await db.from("channels").insert({
      organization_id: ORG_ID, name: c.name, description: c.desc, created_by: userIds[TEAM[0].email],
    }).select("id").single();
    cMap[c.key] = data.id;
  }
  for (const m of MESSAGES) {
    await db.from("messages").insert({
      channel_id: cMap[m.channel], organization_id: ORG_ID, author_id: userIds[m.author],
      body: m.body, created_at: new Date(Date.now() - m.minsAgo * 60000).toISOString(),
    });
  }
  console.log(`✓ ${CHANNELS.length} channels, ${MESSAGES.length} messages`);

  console.log(`\n✅ Seed complete. Log in at your app with:`);
  console.log(`   ${TEAM[0].email} / ${DEMO_PASSWORD}\n`);
}

main().catch((e) => { console.error("\n✖ Seed failed:", e.message); process.exit(1); });
