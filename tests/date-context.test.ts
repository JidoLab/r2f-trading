import { describe, it, expect } from "vitest";
import {
  getCurrentDateContext,
  getCurrentDateValues,
} from "@/lib/date-context";

// First test in the suite — also serves as the harness smoke test. Targets the
// pure, side-effect-free date helpers so assertions are stable across runs
// without mocking the clock.
describe("getCurrentDateValues", () => {
  const v = getCurrentDateValues();

  it("returns a sane four-digit year (>= 2026, the project's floor)", () => {
    expect(typeof v.year).toBe("number");
    expect(v.year).toBeGreaterThanOrEqual(2026);
  });

  it("returns a quarter between 1 and 4", () => {
    expect(v.quarter).toBeGreaterThanOrEqual(1);
    expect(v.quarter).toBeLessThanOrEqual(4);
  });

  it("returns isoDate as a YYYY-MM-DD string", () => {
    expect(v.isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(v.isoDate.startsWith(String(v.year))).toBe(true);
  });

  it("returns non-empty month and dayOfWeek names", () => {
    expect(v.month.length).toBeGreaterThan(0);
    expect(v.dayOfWeek.length).toBeGreaterThan(0);
  });
});

describe("getCurrentDateContext", () => {
  it("embeds the current year and forbids the prior year", () => {
    const { year } = getCurrentDateValues();
    const ctx = getCurrentDateContext();
    expect(ctx).toContain(String(year));
    expect(ctx).toContain(`NEVER ${year - 1}`);
  });

  it("starts with the CURRENT DATE marker prompts rely on", () => {
    expect(getCurrentDateContext().startsWith("CURRENT DATE:")).toBe(true);
  });
});
