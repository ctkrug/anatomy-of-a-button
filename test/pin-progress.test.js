import { afterEach, describe, expect, it } from "vitest";
import { attachPinProgress, computePinProgress, subProgress } from "../src/scroll/progress.js";

describe("computePinProgress", () => {
  // A 3000px section pinned against an 800px viewport: the pin is engaged for
  // 2200px of scrolling, from scrollY 1000 to scrollY 3200.
  const base = { sectionTop: 1000, sectionHeight: 3000, viewportHeight: 800 };

  it("is 0 before the pin engages", () => {
    expect(computePinProgress({ ...base, scrollY: 0 })).toBe(0);
  });

  it("is 0 at the exact moment the section top reaches the viewport top", () => {
    expect(computePinProgress({ ...base, scrollY: 1000 })).toBe(0);
  });

  it("is 1 at the exact moment the pin releases", () => {
    expect(computePinProgress({ ...base, scrollY: 3200 })).toBe(1);
  });

  it("interpolates linearly while the pin is engaged", () => {
    expect(computePinProgress({ ...base, scrollY: 2100 })).toBeCloseTo(0.5);
  });

  it("never returns a value outside [0, 1]", () => {
    expect(computePinProgress({ ...base, scrollY: -9999 })).toBe(0);
    expect(computePinProgress({ ...base, scrollY: 99999 })).toBe(1);
  });

  it("returns 0 when the section is shorter than the viewport and cannot pin", () => {
    expect(
      computePinProgress({ scrollY: 500, sectionTop: 0, sectionHeight: 400, viewportHeight: 800 }),
    ).toBe(0);
  });

  it("returns 0 for a degenerate zero-height section instead of dividing by zero", () => {
    expect(
      computePinProgress({ scrollY: 0, sectionTop: 0, sectionHeight: 0, viewportHeight: 0 }),
    ).toBe(0);
  });

  it("increases monotonically with scroll position", () => {
    let previous = -1;
    for (let scrollY = 0; scrollY <= 4000; scrollY += 25) {
      const value = computePinProgress({ ...base, scrollY });
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});

describe("subProgress", () => {
  it("is 0 at and below the range start", () => {
    expect(subProgress(0.2, 0.2, 0.6)).toBe(0);
    expect(subProgress(0, 0.2, 0.6)).toBe(0);
  });

  it("is 1 at and above the range end", () => {
    expect(subProgress(0.6, 0.2, 0.6)).toBe(1);
    expect(subProgress(1, 0.2, 0.6)).toBe(1);
  });

  it("rescales the middle of the range to 0.5", () => {
    expect(subProgress(0.4, 0.2, 0.6)).toBeCloseTo(0.5);
  });

  it("handles a full 0..1 range as the identity", () => {
    expect(subProgress(0.37, 0, 1)).toBeCloseTo(0.37);
  });

  it("degrades to a step for a zero-width range instead of dividing by zero", () => {
    expect(subProgress(0.4, 0.5, 0.5)).toBe(0);
    expect(subProgress(0.5, 0.5, 0.5)).toBe(1);
    expect(subProgress(0.6, 0.5, 0.5)).toBe(1);
  });

  it("stays within [0, 1] for any input progress", () => {
    for (let p = -1; p <= 2; p += 0.01) {
      const value = subProgress(p, 0.3, 0.7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("attachPinProgress", () => {
  let cleanup;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  // rect.top is viewport-relative, so a faithful stub must derive it from
  // the section's fixed document position minus the *current* scrollY, or a
  // simulated scroll event won't actually move the section.
  function stubViewport({ scrollY, sectionTop, height, viewportHeight }) {
    Object.defineProperty(window, "scrollY", { value: scrollY, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: viewportHeight, configurable: true });
    const section = document.createElement("div");
    section.getBoundingClientRect = () => ({ top: sectionTop - window.scrollY, height });
    document.body.appendChild(section);
    return section;
  }

  it("reports progress immediately on attach, without waiting for an event", () => {
    const section = stubViewport({ scrollY: 2100, sectionTop: 1000, height: 3000, viewportHeight: 800 });
    const values = [];
    cleanup = attachPinProgress(section, (value) => values.push(value));
    expect(values).toHaveLength(1);
    expect(values[0]).toBeCloseTo(0.5);
  });

  it("recomputes progress from computePinProgress on scroll", () => {
    const section = stubViewport({ scrollY: 0, sectionTop: 1000, height: 3000, viewportHeight: 800 });
    const values = [];
    cleanup = attachPinProgress(section, (value) => values.push(value));

    Object.defineProperty(window, "scrollY", { value: 3200, configurable: true });
    window.dispatchEvent(new Event("scroll"));

    expect(values.at(-1)).toBe(1);
  });

  it("recomputes on resize", () => {
    const section = stubViewport({ scrollY: 2100, sectionTop: 1000, height: 3000, viewportHeight: 800 });
    const values = [];
    cleanup = attachPinProgress(section, (value) => values.push(value));

    Object.defineProperty(window, "innerHeight", { value: 400, configurable: true });
    window.dispatchEvent(new Event("resize"));

    expect(values.at(-1)).not.toBe(values[0]);
  });

  it("stops reporting after the returned cleanup runs", () => {
    const section = stubViewport({ scrollY: 0, sectionTop: 1000, height: 3000, viewportHeight: 800 });
    const values = [];
    cleanup = attachPinProgress(section, (value) => values.push(value));
    const countAfterAttach = values.length;

    cleanup();
    cleanup = undefined;
    window.dispatchEvent(new Event("scroll"));

    expect(values).toHaveLength(countAfterAttach);
  });
});
