import { describe, it, expect } from "vitest";
import {
  escapeCsvField, toCSV, reportFilename, REPORT_CATALOG,
  occupancyNightly, occupancyByWeekday, workOrdersByCategory, workOrderAging,
  housekeepingProductivity, stockBelowPar, banquetPipeline,
} from "./reports";
import type {
  OccupancySnapshot, WorkOrder, FnbInventoryItem, BanquetEvent, Space, Profile,
} from "@/types";

function occ(p: Partial<OccupancySnapshot> & { stay_date: string }): OccupancySnapshot {
  return {
    id: `o-${p.stay_date}`, organization_id: "org", building_id: "b",
    rooms_total: 100, rooms_occupied: 50, rooms_out_of_service: 0,
    arrivals: 5, departures: 4, adr_cents: 20000, is_actual: true,
    created_at: "", updated_at: "", ...p,
  };
}

describe("escapeCsvField", () => {
  it("leaves plain values alone", () => {
    expect(escapeCsvField("Room 101")).toBe("Room 101");
    expect(escapeCsvField(42)).toBe("42");
  });

  it("renders null as empty", () => {
    expect(escapeCsvField(null)).toBe("");
  });

  it("quotes fields containing commas, quotes or newlines", () => {
    expect(escapeCsvField("Smith, John")).toBe('"Smith, John"');
    expect(escapeCsvField('He said "hi"')).toBe('"He said ""hi"""');
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralises leading characters a spreadsheet would treat as a formula", () => {
    // Without this, opening the export runs the cell as a formula.
    expect(escapeCsvField("=1+1")).toBe("'=1+1");
    expect(escapeCsvField("+44 7700 900000")).toBe("'+44 7700 900000");
    expect(escapeCsvField("-5")).toBe("'-5");
    expect(escapeCsvField("@handle")).toBe("'@handle");
  });

  it("quotes and escapes a formula that also contains a comma", () => {
    expect(escapeCsvField('=SUM(A1,A2)')).toBe(`"'=SUM(A1,A2)"`);
  });
});

describe("toCSV", () => {
  it("emits a header row and CRLF line endings", () => {
    const csv = toCSV({
      columns: [{ key: "a", label: "Col A" }, { key: "b", label: "Col B" }],
      rows: [{ a: "1", b: "2" }, { a: "3", b: "4" }],
    });
    expect(csv).toBe("Col A,Col B\r\n1,2\r\n3,4");
  });

  it("emits only a header when there are no rows", () => {
    expect(toCSV({ columns: [{ key: "a", label: "A" }], rows: [] })).toBe("A");
  });

  it("writes an empty cell for a key the row does not have", () => {
    const csv = toCSV({
      columns: [{ key: "a", label: "A" }, { key: "missing", label: "M" }],
      rows: [{ a: "1" }],
    });
    expect(csv).toBe("A,M\r\n1,");
  });
});

describe("reportFilename", () => {
  it("slugifies the name and stamps the date", () => {
    expect(reportFilename("Occupancy by night", new Date(2026, 6, 30))).toBe("occupancy-by-night-2026-07-30.csv");
  });

  it("collapses punctuation without leaving stray dashes", () => {
    expect(reportFilename("ADR & RevPAR!", new Date(2026, 0, 5))).toBe("adr-revpar-2026-01-05.csv");
  });
});

describe("REPORT_CATALOG", () => {
  it("has unique ids", () => {
    const ids = REPORT_CATALOG.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every report a name and description", () => {
    for (const r of REPORT_CATALOG) {
      expect(r.name).toBeTruthy();
      expect(r.description).toBeTruthy();
    }
  });
});

describe("occupancyNightly", () => {
  it("lists nights newest first and labels the basis", () => {
    const t = occupancyNightly([
      occ({ stay_date: "2026-07-01" }),
      occ({ stay_date: "2026-07-03", is_actual: false }),
    ]);
    expect(t.rows[0].stay_date).toBe("2026-07-03");
    expect(t.rows[0].basis).toBe("Forecast");
    expect(t.rows[1].basis).toBe("Actual");
  });
});

describe("occupancyByWeekday", () => {
  it("excludes forecast nights from the historical average", () => {
    // 2026-07-06 is a Monday. The forecast Monday at 100% must not move the mean.
    const t = occupancyByWeekday([
      occ({ stay_date: "2026-07-06", rooms_occupied: 50 }),
      occ({ stay_date: "2026-07-13", rooms_occupied: 100, is_actual: false }),
    ]);
    const monday = t.rows.find((r) => r.weekday === "Monday");
    expect(monday?.nights).toBe(1);
    expect(monday?.avg_occupancy).toBe("50.0%");
  });

  it("returns no rows when everything is forecast", () => {
    expect(occupancyByWeekday([occ({ stay_date: "2026-07-06", is_actual: false })]).rows).toEqual([]);
  });
});

function wo(p: Partial<WorkOrder> & { id: string }): WorkOrder {
  return {
    organization_id: "org", space_id: null, asset_id: null, created_by: "u",
    assigned_to: null, title: "T", description: null, status: "open",
    priority: "low", category: "hvac", photos: [], due_date: null,
    completed_at: null, created_at: "2026-07-01T00:00:00Z", updated_at: "", ...p,
  } as WorkOrder;
}

describe("workOrdersByCategory", () => {
  it("counts totals, completions and criticals per category", () => {
    const t = workOrdersByCategory([
      wo({ id: "1", category: "hvac", status: "completed" }),
      wo({ id: "2", category: "hvac", priority: "critical" }),
      wo({ id: "3", category: "plumbing" }),
    ]);
    const hvac = t.rows.find((r) => r.category === "hvac");
    expect(hvac).toMatchObject({ total: 2, completed: 1, open: 1, critical: 1, completion: "50%" });
  });

  it("handles an empty set without dividing by zero", () => {
    expect(workOrdersByCategory([]).rows).toEqual([]);
  });
});

describe("workOrderAging", () => {
  const now = new Date("2026-07-30T00:00:00Z");

  it("excludes completed and cancelled work, oldest first", () => {
    const t = workOrderAging([
      wo({ id: "1", created_at: "2026-07-28T00:00:00Z" }),
      wo({ id: "2", created_at: "2026-07-20T00:00:00Z" }),
      wo({ id: "3", created_at: "2026-01-01T00:00:00Z", status: "completed" }),
      wo({ id: "4", created_at: "2026-01-01T00:00:00Z", status: "cancelled" }),
    ], now);
    expect(t.rows.map((r) => r.age_days)).toEqual([10, 2]);
  });

  it("labels unassigned work rather than leaving it blank", () => {
    const t = workOrderAging([wo({ id: "1" })], now);
    expect(t.rows[0].assignee).toBe("Unassigned");
  });
});

function space(p: Partial<Space> & { id: string }): Space {
  return {
    floor_id: "f", name: p.id, type: "guest_room", status: "operational",
    position_x: 0, position_y: 0, width: 1, height: 1, qr_code: null, notes: null,
    created_at: "", updated_at: "", ...p,
  } as Space;
}

describe("housekeepingProductivity", () => {
  const staff = [{ id: "h1", full_name: "Rosa" }] as Profile[];

  it("counts assigned vs completed per person", () => {
    const t = housekeepingProductivity([
      space({ id: "r1", housekeeper_id: "h1", housekeeping_status: "ready" }),
      space({ id: "r2", housekeeper_id: "h1", housekeeping_status: "cleaned" }),
      space({ id: "r3", housekeeper_id: "h1", housekeeping_status: "dirty" }),
    ], staff);
    expect(t.rows[0]).toMatchObject({ housekeeper: "Rosa", assigned: 3, completed: 2, remaining: 1, progress: "67%" });
  });

  it("reports unassigned rooms in the summary", () => {
    const t = housekeepingProductivity([space({ id: "r1" })], staff);
    expect(t.summary).toBe("1 room unassigned");
    expect(t.rows).toEqual([]);
  });

  it("still names someone who has left the housekeeper list", () => {
    const t = housekeepingProductivity([
      space({ id: "r1", housekeeper_id: "gone", housekeeper: { id: "gone", full_name: "Ex Staff", avatar_url: null } }),
    ], staff);
    expect(t.rows[0].housekeeper).toBe("Ex Staff");
  });
});

describe("stockBelowPar", () => {
  const item = (p: Partial<FnbInventoryItem> & { id: string }): FnbInventoryItem => ({
    organization_id: "org", outlet_id: null, name: p.id, category: null,
    unit: "each", on_hand: 0, par_level: 0, unit_cost_cents: null,
    supplier: null, last_counted_at: null, created_at: "", updated_at: "", ...p,
  });

  it("includes lines at or under par, worst shortfall first", () => {
    const t = stockBelowPar([
      item({ id: "a", on_hand: 9, par_level: 10 }),   // short by 1
      item({ id: "b", on_hand: 1, par_level: 10 }),   // short by 9
      item({ id: "c", on_hand: 20, par_level: 10 }),  // over par — excluded
      item({ id: "d", on_hand: 5, par_level: 5 }),    // exactly at par — included
    ]);
    expect(t.rows.map((r) => r.item)).toEqual(["b", "a", "d"]);
  });

  it("is empty when everything is stocked", () => {
    const t = stockBelowPar([item({ id: "a", on_hand: 50, par_level: 10 })]);
    expect(t.rows).toEqual([]);
    expect(t.summary).toBe("0 lines to reorder");
  });
});

describe("banquetPipeline", () => {
  const ev = (p: Partial<BanquetEvent> & { id: string }): BanquetEvent => ({
    organization_id: "org", space_id: null, name: p.id, client_name: "C",
    client_email: null, client_phone: null, status: "confirmed",
    setup_style: "banquet_rounds", headcount: 10,
    starts_at: "2026-08-01T10:00:00Z", ends_at: "2026-08-01T12:00:00Z",
    setup_starts_at: null, teardown_ends_at: null, quoted_cents: 100000,
    deposit_paid: false, av_needs: [], catering_notes: null, notes: null,
    created_by: null, created_at: "", updated_at: "", ...p,
  });

  it("drops cancelled events and sorts by start", () => {
    const t = banquetPipeline([
      ev({ id: "late", starts_at: "2026-09-01T10:00:00Z" }),
      ev({ id: "early", starts_at: "2026-08-01T10:00:00Z" }),
      ev({ id: "dead", status: "cancelled" }),
    ]);
    expect(t.rows.map((r) => r.event)).toEqual(["early", "late"]);
  });

  it("counts only committed business toward the total", () => {
    // Tentative and inquiry are not money in the bank, so they stay out of it.
    const t = banquetPipeline([
      ev({ id: "a", status: "confirmed", quoted_cents: 500000 }),
      ev({ id: "b", status: "tentative", quoted_cents: 900000 }),
      ev({ id: "c", status: "inquiry", quoted_cents: 700000 }),
    ]);
    expect(t.summary).toBe("$5,000 committed across 3 events");
  });

  it("renders a missing quote as an em dash rather than $0", () => {
    const t = banquetPipeline([ev({ id: "a", quoted_cents: null })]);
    expect(t.rows[0].quoted).toBe("—");
  });
});
