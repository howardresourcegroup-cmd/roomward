import { describe, it, expect } from "vitest";
import {
  DASHBOARD_WIDGETS, DEPARTMENTS, ROLE_DEFAULTS, defaultLayout, defaultLayoutForRole,
  resolveLayout, visibleWidgets, reorder, reorderVisible, toggleVisible, getWidget,
} from "./dashboard-widgets";
import type { DashboardLayout, WidgetId } from "@/types";

const allow = () => true;
const deny = () => false;

describe("catalog", () => {
  it("has unique ids", () => {
    const ids = DASHBOARD_WIDGETS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every widget a title and description", () => {
    for (const w of DASHBOARD_WIDGETS) {
      expect(w.title).toBeTruthy();
      expect(w.description).toBeTruthy();
    }
  });

  it("looks up by id", () => {
    expect(getWidget("stats")?.title).toBe("Operations stats");
    expect(getWidget("nope" as WidgetId)).toBeUndefined();
  });
});

describe("defaultLayout", () => {
  it("includes every widget in catalog order", () => {
    expect(defaultLayout().widgets.map((w) => w.id)).toEqual(DASHBOARD_WIDGETS.map((w) => w.id));
  });

  it("respects each widget's default visibility", () => {
    const l = defaultLayout();
    expect(l.widgets.find((w) => w.id === "stats")?.visible).toBe(true);
    expect(l.widgets.find((w) => w.id === "fnb_low_stock")?.visible).toBe(false);
  });
});

describe("resolveLayout", () => {
  it("falls back to defaults for null, undefined or an empty list", () => {
    const ids = DASHBOARD_WIDGETS.map((w) => w.id);
    expect(resolveLayout(null).map((w) => w.id)).toEqual(ids);
    expect(resolveLayout(undefined).map((w) => w.id)).toEqual(ids);
    expect(resolveLayout({ widgets: [], version: 1 }).map((w) => w.id)).toEqual(ids);
  });

  it("preserves the saved order", () => {
    const saved: DashboardLayout = {
      version: 1,
      widgets: [{ id: "activity_feed", visible: true }, { id: "stats", visible: true }],
    };
    const out = resolveLayout(saved);
    expect(out[0].id).toBe("activity_feed");
    expect(out[1].id).toBe("stats");
  });

  it("appends widgets added since the layout was saved, at the end", () => {
    // A layout saved when only "stats" existed must still surface everything else.
    const saved: DashboardLayout = { version: 1, widgets: [{ id: "stats", visible: true }] };
    const out = resolveLayout(saved);
    expect(out[0].id).toBe("stats");
    expect(out.length).toBe(DASHBOARD_WIDGETS.length);
    expect(out.map((w) => w.id).sort()).toEqual(DASHBOARD_WIDGETS.map((w) => w.id).sort());
  });

  it("appends newly-added widgets hidden, so an upgrade never rearranges a dashboard someone arranged", () => {
    // activity_feed is defaultVisible in the catalog, but this layout predates
    // it. Injecting it into a deliberately-ordered board is more intrusive than
    // leaving it to be discovered in Customize.
    const saved: DashboardLayout = { version: 1, widgets: [{ id: "stats", visible: true }] };
    const out = resolveLayout(saved);
    expect(out.find((w) => w.id === "activity_feed")?.visible).toBe(false);
    expect(out.find((w) => w.id === "fnb_low_stock")?.visible).toBe(false);
    // The saved widget keeps its state and its position.
    expect(out[0]).toEqual({ id: "stats", visible: true });
  });

  it("drops ids the catalog no longer knows about", () => {
    const saved = {
      version: 1,
      widgets: [{ id: "retired_widget" as WidgetId, visible: true }, { id: "stats" as WidgetId, visible: true }],
    };
    const out = resolveLayout(saved);
    expect(out.some((w) => (w.id as string) === "retired_widget")).toBe(false);
    expect(out[0].id).toBe("stats");
  });

  it("keeps the first occurrence of a duplicated id", () => {
    const saved: DashboardLayout = {
      version: 1,
      widgets: [
        { id: "stats", visible: false },
        { id: "stats", visible: true },
        { id: "activity_feed", visible: true },
      ],
    };
    const out = resolveLayout(saved);
    expect(out.filter((w) => w.id === "stats")).toHaveLength(1);
    expect(out.find((w) => w.id === "stats")?.visible).toBe(false);
  });

  it("honours an explicitly hidden widget", () => {
    const saved: DashboardLayout = { version: 1, widgets: [{ id: "stats", visible: false }] };
    expect(resolveLayout(saved).find((w) => w.id === "stats")?.visible).toBe(false);
  });

  it("survives a malformed widgets value", () => {
    const bad = { version: 1, widgets: "not an array" } as unknown as DashboardLayout;
    expect(resolveLayout(bad).map((w) => w.id)).toEqual(DASHBOARD_WIDGETS.map((w) => w.id));
  });
});

describe("departments", () => {
  it("assigns every widget to a known department", () => {
    for (const w of DASHBOARD_WIDGETS) {
      expect(DEPARTMENTS).toContain(w.department);
    }
  });

  it("covers every department with at least one widget", () => {
    const used = new Set(DASHBOARD_WIDGETS.map((w) => w.department));
    for (const d of DEPARTMENTS) expect(used).toContain(d);
  });
});

describe("defaultLayoutForRole", () => {
  it("falls back to catalog defaults for a role with no entry", () => {
    const manager = defaultLayoutForRole("manager");
    expect(manager.widgets.map((w) => w.id)).toEqual(DASHBOARD_WIDGETS.map((w) => w.id));
    expect(manager.widgets.find((w) => w.id === "stats")?.visible).toBe(true);
  });

  it("treats an unknown or missing role as the fallback", () => {
    expect(defaultLayoutForRole(null).widgets).toEqual(defaultLayoutForRole("nonsense").widgets);
  });

  it("puts a housekeeper's own rooms first", () => {
    const l = defaultLayoutForRole("housekeeping");
    const visible = l.widgets.filter((w) => w.visible).map((w) => w.id);
    expect(visible[0]).toBe("my_rooms");
    expect(visible).toContain("room_turnover");
  });

  it("leads maintenance with their queue, and the legacy technician slug matches", () => {
    const maint = defaultLayoutForRole("maintenance");
    expect(maint.widgets.filter((w) => w.visible)[0].id).toBe("my_work_queue");
    expect(defaultLayoutForRole("technician").widgets).toEqual(maint.widgets);
  });

  it("gives front desk readiness rather than engineering trend", () => {
    const visible = defaultLayoutForRole("front_desk").widgets.filter((w) => w.visible).map((w) => w.id);
    expect(visible).toContain("rooms_ready");
    expect(visible).not.toContain("metrics_chart");
  });

  it("still lists the whole catalog, just mostly hidden, so nothing is unreachable", () => {
    for (const role of Object.keys(ROLE_DEFAULTS)) {
      const l = defaultLayoutForRole(role);
      expect(l.widgets.map((w) => w.id).sort()).toEqual(DASHBOARD_WIDGETS.map((w) => w.id).sort());
    }
  });

  it("names only real widgets in every role default", () => {
    const ids = new Set(DASHBOARD_WIDGETS.map((w) => w.id));
    for (const [role, list] of Object.entries(ROLE_DEFAULTS)) {
      for (const id of list) {
        expect(ids, `${role} references unknown widget "${id}"`).toContain(id);
      }
    }
  });

  it("has no duplicates within a role default", () => {
    for (const [role, list] of Object.entries(ROLE_DEFAULTS)) {
      expect(new Set(list).size, `${role} repeats a widget`).toBe(list.length);
    }
  });
});

describe("role defaults respect permissions at render time", () => {
  it("drops a default widget the role cannot see", () => {
    // front_desk defaults include occupancy_last_night, which needs reports.view.
    const withPerm = visibleWidgets(null, () => true, "front_desk").map((w) => w.id);
    const without = visibleWidgets(null, (p) => p !== "reports.view", "front_desk").map((w) => w.id);
    expect(withPerm).toContain("occupancy_last_night");
    expect(without).not.toContain("occupancy_last_night");
    expect(without).toContain("rooms_ready"); // unrelated widget survives
  });
});

describe("visibleWidgets", () => {
  it("returns only visible widgets", () => {
    const saved: DashboardLayout = {
      version: 1,
      widgets: [{ id: "stats", visible: true }, { id: "activity_feed", visible: false }],
    };
    const ids = visibleWidgets(saved, allow).map((w) => w.id);
    expect(ids).toContain("stats");
    expect(ids).not.toContain("activity_feed");
  });

  it("filters out widgets the user lacks permission for", () => {
    const ids = visibleWidgets(null, deny).map((w) => w.id);
    // Only widgets with no permission requirement survive a blanket denial.
    expect(ids).not.toContain("occupancy_last_night");
    expect(ids).toContain("activity_feed");
  });

  it("applies permissions per key, not all-or-nothing", () => {
    const can = (p: string) => p === "reports.view";
    const ids = visibleWidgets(null, can).map((w) => w.id);
    expect(ids).toContain("occupancy_last_night"); // reports.view
    expect(ids).not.toContain("urgent_work_orders"); // work_orders.view
  });
});

describe("reorder", () => {
  const prefs = [
    { id: "stats" as WidgetId, visible: true },
    { id: "activity_feed" as WidgetId, visible: true },
    { id: "metrics_chart" as WidgetId, visible: true },
  ];

  it("swaps with the neighbour above", () => {
    expect(reorder(prefs, "activity_feed", "up").map((p) => p.id))
      .toEqual(["activity_feed", "stats", "metrics_chart"]);
  });

  it("swaps with the neighbour below", () => {
    expect(reorder(prefs, "activity_feed", "down").map((p) => p.id))
      .toEqual(["stats", "metrics_chart", "activity_feed"]);
  });

  it("is a no-op at either edge", () => {
    expect(reorder(prefs, "stats", "up")).toBe(prefs);
    expect(reorder(prefs, "metrics_chart", "down")).toBe(prefs);
  });

  it("is a no-op for an unknown id", () => {
    expect(reorder(prefs, "nope" as WidgetId, "up")).toBe(prefs);
  });

  it("does not mutate the input", () => {
    const before = prefs.map((p) => p.id);
    reorder(prefs, "activity_feed", "up");
    expect(prefs.map((p) => p.id)).toEqual(before);
  });
});

describe("reorderVisible", () => {
  // A hidden widget sits between the two visible ones. Plain reorder would swap
  // with it and nothing would appear to move.
  const prefs = [
    { id: "stats" as WidgetId, visible: true },
    { id: "metrics_chart" as WidgetId, visible: false },
    { id: "activity_feed" as WidgetId, visible: true },
  ];

  it("skips hidden widgets when moving up", () => {
    expect(reorderVisible(prefs, "activity_feed", "up").map((p) => p.id))
      .toEqual(["activity_feed", "metrics_chart", "stats"]);
  });

  it("skips hidden widgets when moving down", () => {
    expect(reorderVisible(prefs, "stats", "down").map((p) => p.id))
      .toEqual(["activity_feed", "metrics_chart", "stats"]);
  });

  it("is a no-op with no visible neighbour in that direction", () => {
    expect(reorderVisible(prefs, "stats", "up")).toBe(prefs);
    expect(reorderVisible(prefs, "activity_feed", "down")).toBe(prefs);
  });

  it("refuses to move a hidden widget", () => {
    expect(reorderVisible(prefs, "metrics_chart", "up")).toBe(prefs);
  });

  it("is a no-op for an unknown id, and never mutates", () => {
    expect(reorderVisible(prefs, "nope" as WidgetId, "up")).toBe(prefs);
    const before = prefs.map((p) => p.id);
    reorderVisible(prefs, "activity_feed", "up");
    expect(prefs.map((p) => p.id)).toEqual(before);
  });
});

describe("toggleVisible", () => {
  it("flips only the named widget", () => {
    const prefs = [
      { id: "stats" as WidgetId, visible: true },
      { id: "activity_feed" as WidgetId, visible: true },
    ];
    const out = toggleVisible(prefs, "stats");
    expect(out[0].visible).toBe(false);
    expect(out[1].visible).toBe(true);
    expect(prefs[0].visible).toBe(true); // input untouched
  });
});
