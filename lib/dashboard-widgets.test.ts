import { describe, it, expect } from "vitest";
import {
  DASHBOARD_WIDGETS, defaultLayout, resolveLayout, visibleWidgets,
  reorder, toggleVisible, getWidget,
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

  it("gives newly-appended widgets their catalog default, not blanket visibility", () => {
    const saved: DashboardLayout = { version: 1, widgets: [{ id: "stats", visible: true }] };
    const out = resolveLayout(saved);
    expect(out.find((w) => w.id === "fnb_low_stock")?.visible).toBe(false);
    expect(out.find((w) => w.id === "activity_feed")?.visible).toBe(true);
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
