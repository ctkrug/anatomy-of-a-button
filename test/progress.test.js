import { describe, expect, it } from "vitest";
import { computeProgress } from "../src/scroll/progress.js";

describe("computeProgress", () => {
  const base = { sectionTop: 1000, sectionHeight: 2000, viewportHeight: 800 };

  it("is 0 before the section enters the viewport", () => {
    expect(computeProgress({ ...base, scrollY: 0 })).toBe(0);
  });

  it("is 0 at the exact moment the section's top reaches the viewport bottom", () => {
    expect(computeProgress({ ...base, scrollY: 200 })).toBe(0);
  });

  it("is 1 once the section has fully scrolled past", () => {
    expect(computeProgress({ ...base, scrollY: 3000 })).toBe(1);
  });

  it("interpolates linearly through the middle of the section", () => {
    const start = base.sectionTop - base.viewportHeight;
    const end = base.sectionTop + base.sectionHeight;
    const midpoint = start + (end - start) / 2;
    expect(computeProgress({ ...base, scrollY: midpoint })).toBeCloseTo(0.5);
  });

  it("never returns a value outside [0, 1]", () => {
    expect(computeProgress({ ...base, scrollY: -5000 })).toBe(0);
    expect(computeProgress({ ...base, scrollY: 50000 })).toBe(1);
  });

  it("returns 0 for a degenerate zero-height span instead of dividing by zero", () => {
    expect(
      computeProgress({ scrollY: 100, sectionTop: 100, sectionHeight: 0, viewportHeight: 0 }),
    ).toBe(0);
  });

  it("returns 0 rather than NaN for a non-finite scrollY", () => {
    for (const scrollY of [NaN, Infinity, -Infinity]) {
      const value = computeProgress({ ...base, scrollY });
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
