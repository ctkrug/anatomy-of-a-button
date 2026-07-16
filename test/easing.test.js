import { describe, expect, it } from "vitest";
import { clamp, easeInOutCubic, easeOutCubic, envelope, fadeBand, lerp } from "../src/scene/easing.js";

describe("clamp", () => {
  it("passes through values inside the range", () => {
    expect(clamp(0.5)).toBe(0.5);
  });

  it("clamps to the bounds", () => {
    expect(clamp(-3)).toBe(0);
    expect(clamp(9)).toBe(1);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("falls back to the minimum for NaN rather than propagating it", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp(NaN, 5, 10)).toBe(5);
  });
});

describe("lerp", () => {
  it("returns the endpoints at t=0 and t=1", () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it("interpolates the midpoint", () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it("clamps rather than extrapolating past the endpoints", () => {
    expect(lerp(10, 20, -1)).toBe(10);
    expect(lerp(10, 20, 2)).toBe(20);
  });

  it("interpolates a descending range", () => {
    expect(lerp(100, 0, 0.25)).toBe(75);
  });
});

describe("easeInOutCubic", () => {
  it("pins the endpoints", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it("passes through 0.5 at the midpoint", () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });

  it("is symmetric about the midpoint", () => {
    for (const t of [0.1, 0.25, 0.4]) {
      expect(easeInOutCubic(t)).toBeCloseTo(1 - easeInOutCubic(1 - t));
    }
  });

  it("is monotonically non-decreasing and stays in [0, 1]", () => {
    let previous = -1;
    for (let t = -0.5; t <= 1.5; t += 0.01) {
      const value = easeInOutCubic(t);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
  });
});

describe("easeOutCubic", () => {
  it("pins the endpoints", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("decelerates: it is ahead of linear through the middle", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it("is monotonically non-decreasing", () => {
    let previous = -1;
    for (let t = 0; t <= 1; t += 0.01) {
      const value = easeOutCubic(t);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = value;
    }
  });
});

describe("envelope", () => {
  const band = { start: 0.2, peakStart: 0.3, peakEnd: 0.7, end: 0.8 };

  it("is 0 outside the band", () => {
    expect(envelope(0, band)).toBe(0);
    expect(envelope(0.2, band)).toBe(0);
    expect(envelope(0.8, band)).toBe(0);
    expect(envelope(1, band)).toBe(0);
  });

  it("holds at 1 across the plateau", () => {
    expect(envelope(0.3, band)).toBe(1);
    expect(envelope(0.5, band)).toBe(1);
    expect(envelope(0.7, band)).toBe(1);
  });

  it("ramps up on the way in and down on the way out", () => {
    expect(envelope(0.25, band)).toBeCloseTo(0.5);
    expect(envelope(0.75, band)).toBeCloseTo(0.5);
  });

  it("is symmetric for a symmetric band", () => {
    for (const offset of [0.02, 0.05, 0.08]) {
      expect(envelope(0.2 + offset, band)).toBeCloseTo(envelope(0.8 - offset, band));
    }
  });

  it("is continuous — no jump cuts anywhere, including at the band boundaries", () => {
    // The steepest the ramp can get is easeInOutCubic's peak slope of 3,
    // rescaled by the 0.1-wide ramp: a 0.001 step can move at most ~0.03.
    const step = 0.001;
    const maxJump = step * (3 / 0.1) * 1.2;
    let previous = envelope(0, band);
    for (let p = 0; p <= 1; p += step) {
      const value = envelope(p, band);
      expect(Math.abs(value - previous)).toBeLessThan(maxJump);
      previous = value;
    }
  });

  it("stays in [0, 1] across the whole domain", () => {
    for (let p = -0.5; p <= 1.5; p += 0.01) {
      const value = envelope(p, band);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("fadeBand", () => {
  it("fades in from the start and out to the end", () => {
    expect(fadeBand(0.1, { start: 0.1, end: 0.5 })).toBe(0);
    expect(fadeBand(0.3, { start: 0.1, end: 0.5 })).toBe(1);
    expect(fadeBand(0.5, { start: 0.1, end: 0.5 })).toBe(0);
  });

  it("does not overlap its fades when the band is narrower than twice the fade", () => {
    const narrow = { start: 0.4, end: 0.42, fade: 0.1 };
    expect(fadeBand(0.41, narrow)).toBe(1);
    expect(fadeBand(0.4, narrow)).toBe(0);
    expect(fadeBand(0.42, narrow)).toBe(0);
  });

  it("stays in [0, 1] across the whole domain", () => {
    for (let p = 0; p <= 1; p += 0.005) {
      const value = fadeBand(p, { start: 0.2, end: 0.6 });
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
