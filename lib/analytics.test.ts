import { describe, it, expect } from "vitest";
import {
  toStayDate, addDays, sellableRooms, toMetrics,
  lastNight, tonight, tomorrowNight,
  occupancyDelta, sameNightLastWeek, summarizeRange, inRange,
  formatPct, formatCents, formatDeltaPts,
} from "./analytics";
import type { OccupancySnapshot } from "@/types";

function snap(partial: Partial<OccupancySnapshot> & { stay_date: string }): OccupancySnapshot {
  return {
    id: `s-${partial.stay_date}`,
    organization_id: "org-1",
    building_id: "b-1",
    rooms_total: 100,
    rooms_occupied: 50,
    rooms_out_of_service: 0,
    arrivals: 10,
    departures: 8,
    adr_cents: 20000,
    is_actual: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

describe("addDays", () => {
  it("shifts forward and backward across month and year boundaries", () => {
    expect(addDays("2026-07-30", 1)).toBe("2026-07-31");
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-03-15", 0)).toBe("2026-03-15");
  });

  it("handles leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01"); // not a leap year
  });

  it("does not slide a night when crossing a DST boundary", () => {
    // 2026-11-01 is the fall-back day in US zones. Adding 86_400_000 ms to a
    // local-midnight Date and reading local getters returns 2026-11-01 again,
    // because that calendar day is 25 hours long. This is the case that bites;
    // the spring-forward dates below are here as regression cover.
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
  });

  it("round-trips over a long span", () => {
    let d = "2026-01-01";
    for (let i = 0; i < 400; i++) d = addDays(d, 1);
    for (let i = 0; i < 400; i++) d = addDays(d, -1);
    expect(d).toBe("2026-01-01");
  });
});

describe("toStayDate", () => {
  it("formats local calendar date with zero padding", () => {
    expect(toStayDate(new Date(2026, 6, 5))).toBe("2026-07-05");
    expect(toStayDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("sellableRooms", () => {
  it("subtracts out-of-service rooms", () => {
    expect(sellableRooms({ rooms_total: 100, rooms_out_of_service: 5 })).toBe(95);
  });

  it("never goes negative", () => {
    expect(sellableRooms({ rooms_total: 3, rooms_out_of_service: 10 })).toBe(0);
  });
});

describe("toMetrics", () => {
  it("measures occupancy against sellable rooms, not total", () => {
    // 50 of 90 sellable is 55.6%, not the 50% you'd get against the raw total.
    const m = toMetrics(snap({ stay_date: "2026-07-29", rooms_total: 100, rooms_out_of_service: 10, rooms_occupied: 50 }));
    expect(m.rooms_sellable).toBe(90);
    expect(m.occupancy_pct).toBeCloseTo(55.5556, 3);
  });

  it("computes RevPAR as room revenue spread over sellable rooms", () => {
    const m = toMetrics(snap({ stay_date: "2026-07-29", rooms_total: 100, rooms_out_of_service: 0, rooms_occupied: 50, adr_cents: 20000 }));
    expect(m.revpar_cents).toBe(10000); // $200 ADR at 50% = $100 RevPAR
  });

  it("returns null RevPAR when no rate is known", () => {
    expect(toMetrics(snap({ stay_date: "2026-07-29", adr_cents: null })).revpar_cents).toBeNull();
  });

  it("does not divide by zero when every room is out of service", () => {
    const m = toMetrics(snap({ stay_date: "2026-07-29", rooms_total: 10, rooms_out_of_service: 10, rooms_occupied: 0 }));
    expect(m.occupancy_pct).toBe(0);
    expect(m.revpar_cents).toBeNull();
  });
});

describe("night selectors", () => {
  const today = new Date(2026, 6, 30); // 2026-07-30
  const snaps = [
    snap({ stay_date: "2026-07-28", rooms_occupied: 40 }),
    snap({ stay_date: "2026-07-29", rooms_occupied: 60 }),
    snap({ stay_date: "2026-07-30", rooms_occupied: 70 }),
    snap({ stay_date: "2026-07-31", rooms_occupied: 80, is_actual: false }),
  ];

  it("treats last night as the night begun yesterday", () => {
    expect(lastNight(snaps, today)?.stay_date).toBe("2026-07-29");
    expect(lastNight(snaps, today)?.rooms_occupied).toBe(60);
  });

  it("treats tonight as the night begun today", () => {
    expect(tonight(snaps, today)?.stay_date).toBe("2026-07-30");
  });

  it("treats tomorrow as the night begun tomorrow, and keeps it flagged as forecast", () => {
    const t = tomorrowNight(snaps, today);
    expect(t?.stay_date).toBe("2026-07-31");
    expect(t?.is_actual).toBe(false);
  });

  it("returns null rather than guessing when the night is missing", () => {
    expect(lastNight([], today)).toBeNull();
    expect(tomorrowNight([], today)).toBeNull();
  });
});

describe("occupancyDelta", () => {
  const a = toMetrics(snap({ stay_date: "2026-07-29", rooms_occupied: 60 }));
  const b = toMetrics(snap({ stay_date: "2026-07-22", rooms_occupied: 50 }));

  it("returns percentage-point difference", () => {
    expect(occupancyDelta(a, b)).toBeCloseTo(10, 6);
  });

  it("returns null when either side is missing, rather than a misleading zero", () => {
    expect(occupancyDelta(a, null)).toBeNull();
    expect(occupancyDelta(null, b)).toBeNull();
    expect(occupancyDelta(null, null)).toBeNull();
  });
});

describe("sameNightLastWeek", () => {
  it("looks back exactly seven nights", () => {
    const snaps = [snap({ stay_date: "2026-07-22", rooms_occupied: 30 }), snap({ stay_date: "2026-07-29" })];
    expect(sameNightLastWeek(snaps, "2026-07-29")?.rooms_occupied).toBe(30);
  });

  it("is null when that night has no data", () => {
    expect(sameNightLastWeek([snap({ stay_date: "2026-07-29" })], "2026-07-29")).toBeNull();
  });
});

describe("summarizeRange", () => {
  it("returns a zeroed summary for no nights", () => {
    const s = summarizeRange([]);
    expect(s.nights).toBe(0);
    expect(s.avg_adr_cents).toBeNull();
    expect(s.peak).toBeNull();
    expect(s.trough).toBeNull();
  });

  it("totals room-nights and finds peak and trough", () => {
    const s = summarizeRange([
      snap({ stay_date: "2026-07-01", rooms_occupied: 20 }),
      snap({ stay_date: "2026-07-02", rooms_occupied: 80 }),
      snap({ stay_date: "2026-07-03", rooms_occupied: 50 }),
    ]);
    expect(s.nights).toBe(3);
    expect(s.total_room_nights).toBe(150);
    expect(s.peak?.stay_date).toBe("2026-07-02");
    expect(s.trough?.stay_date).toBe("2026-07-01");
  });

  it("weights ADR by rooms sold, not by night", () => {
    // 90 rooms at $100 and 10 rooms at $300 is $120 average rate paid —
    // an unweighted mean of the two nightly rates would say $200.
    const s = summarizeRange([
      snap({ stay_date: "2026-07-01", rooms_occupied: 90, adr_cents: 10000 }),
      snap({ stay_date: "2026-07-02", rooms_occupied: 10, adr_cents: 30000 }),
    ]);
    expect(s.avg_adr_cents).toBe(12000);
  });

  it("ignores nights with no rate when averaging ADR", () => {
    const s = summarizeRange([
      snap({ stay_date: "2026-07-01", rooms_occupied: 10, adr_cents: 20000 }),
      snap({ stay_date: "2026-07-02", rooms_occupied: 10, adr_cents: null }),
    ]);
    expect(s.avg_adr_cents).toBe(20000);
  });
});

describe("inRange", () => {
  const snaps = [
    snap({ stay_date: "2026-07-03" }),
    snap({ stay_date: "2026-07-01" }),
    snap({ stay_date: "2026-07-05" }),
  ];

  it("filters inclusively and sorts chronologically", () => {
    expect(inRange(snaps, "2026-07-01", "2026-07-03").map((s) => s.stay_date))
      .toEqual(["2026-07-01", "2026-07-03"]);
  });

  it("returns nothing for a range with no nights", () => {
    expect(inRange(snaps, "2026-08-01", "2026-08-31")).toEqual([]);
  });
});

describe("formatting", () => {
  it("formats percentages", () => {
    expect(formatPct(55.5556)).toBe("56%");
    expect(formatPct(55.5556, 1)).toBe("55.6%");
  });

  it("formats cents as whole dollars, and null as an em dash", () => {
    expect(formatCents(20000)).toBe("$200");
    expect(formatCents(1234567)).toBe("$12,346");
    expect(formatCents(null)).toBe("—");
  });

  it("signs percentage-point deltas", () => {
    expect(formatDeltaPts(4.21)).toBe("+4.2 pts");
    expect(formatDeltaPts(-3)).toBe("-3.0 pts");
    expect(formatDeltaPts(null)).toBe("—");
  });
});
