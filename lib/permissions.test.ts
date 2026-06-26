import { describe, it, expect } from "vitest";
import {
  PERMISSION_CATALOG,
  ALL_PERMISSIONS,
  ROLE_COLORS,
  ROLE_COLOR_OPTIONS,
  isMaintenanceRole,
} from "./permissions";

describe("permission catalog", () => {
  it("has unique, non-empty, dotted permission keys", () => {
    const keys = ALL_PERMISSIONS;
    expect(keys.length).toBeGreaterThan(0);
    expect(new Set(keys).size).toBe(keys.length); // no duplicates
    for (const k of keys) {
      expect(k).toMatch(/^[a-z_]+\.[a-z_]+$/); // area.action
    }
  });

  it("flattens to exactly the catalog's permissions", () => {
    const fromGroups = PERMISSION_CATALOG.flatMap((g) => g.permissions.map((p) => p.key));
    expect(ALL_PERMISSIONS).toEqual(fromGroups);
  });

  it("gives every permission a label and description", () => {
    for (const group of PERMISSION_CATALOG) {
      expect(group.area).toBeTruthy();
      for (const p of group.permissions) {
        expect(p.label).toBeTruthy();
        expect(p.description).toBeTruthy();
      }
    }
  });
});

describe("role colors", () => {
  it("exposes every color key as an option", () => {
    expect(ROLE_COLOR_OPTIONS).toEqual(Object.keys(ROLE_COLORS));
  });
});

describe("isMaintenanceRole", () => {
  it("treats both the legacy 'technician' and the slug 'maintenance' as maintenance", () => {
    expect(isMaintenanceRole("maintenance")).toBe(true);
    expect(isMaintenanceRole("technician")).toBe(true);
  });

  it("is false for other roles and nullish input", () => {
    for (const r of ["admin", "manager", "housekeeping", "front_desk", "viewer", "hr"]) {
      expect(isMaintenanceRole(r)).toBe(false);
    }
    expect(isMaintenanceRole(null)).toBe(false);
    expect(isMaintenanceRole(undefined)).toBe(false);
  });
});
