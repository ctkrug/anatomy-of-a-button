import { afterEach, describe, expect, it } from "vitest";
import { attachScrollProgress, computeProgress } from "../src/scroll/progress.js";

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

describe("attachScrollProgress", () => {
  let cleanup;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  // Mirrors pin-progress.test.js's stubViewport: rect.top is viewport-relative,
  // so the stub derives it from a fixed document position minus the current
  // scrollY, or a simulated scroll event won't actually move the section.
  function stubViewport({ scrollY, sectionTop, height, viewportHeight }) {
    Object.defineProperty(window, "scrollY", { value: scrollY, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: viewportHeight, configurable: true });
    const section = document.createElement("div");
    section.getBoundingClientRect = () => ({ top: sectionTop - window.scrollY, height });
    document.body.appendChild(section);
    return section;
  }

  it("reports progress immediately on attach, without waiting for an event", () => {
    // computeProgress's own midpoint: start = sectionTop - viewportHeight =
    // 200, end = sectionTop + sectionHeight = 3000, so scrollY 1600 is halfway.
    const section = stubViewport({ scrollY: 1600, sectionTop: 1000, height: 2000, viewportHeight: 800 });
    const values = [];
    cleanup = attachScrollProgress(section, (value) => values.push(value));
    expect(values).toHaveLength(1);
    expect(values[0]).toBeCloseTo(0.5);
  });

  it("recomputes progress from computeProgress on scroll", () => {
    const section = stubViewport({ scrollY: 0, sectionTop: 1000, height: 2000, viewportHeight: 800 });
    const values = [];
    cleanup = attachScrollProgress(section, (value) => values.push(value));

    Object.defineProperty(window, "scrollY", { value: 3000, configurable: true });
    window.dispatchEvent(new Event("scroll"));

    expect(values.at(-1)).toBe(1);
  });

  it("recomputes on resize", () => {
    const section = stubViewport({ scrollY: 1000, sectionTop: 1000, height: 2000, viewportHeight: 800 });
    const values = [];
    cleanup = attachScrollProgress(section, (value) => values.push(value));

    Object.defineProperty(window, "innerHeight", { value: 400, configurable: true });
    window.dispatchEvent(new Event("resize"));

    expect(values.at(-1)).not.toBe(values[0]);
  });

  it("stops reporting after the returned cleanup runs", () => {
    const section = stubViewport({ scrollY: 0, sectionTop: 1000, height: 2000, viewportHeight: 800 });
    const values = [];
    cleanup = attachScrollProgress(section, (value) => values.push(value));
    const countAfterAttach = values.length;

    cleanup();
    cleanup = undefined;
    window.dispatchEvent(new Event("scroll"));

    expect(values).toHaveLength(countAfterAttach);
  });
});
