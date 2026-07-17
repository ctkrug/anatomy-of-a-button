import { describe, expect, it } from "vitest";
import { STAGES, stageAt } from "../src/scene/stages.js";

describe("STAGES data", () => {
  it("covers the pipeline the vision promises, in order", () => {
    expect(STAGES.map((s) => s.id)).toEqual([
      "rest",
      "dom",
      "box",
      "paint",
      "composite",
      "recompose",
    ]);
  });

  it("starts at 0 and ends at 1", () => {
    expect(STAGES[0].range[0]).toBe(0);
    expect(STAGES[STAGES.length - 1].range[1]).toBe(1);
  });

  it("has contiguous ranges with no gaps or overlaps", () => {
    for (let i = 1; i < STAGES.length; i += 1) {
      expect(STAGES[i].range[0]).toBe(STAGES[i - 1].range[1]);
    }
  });

  it("gives every stage a non-empty forward range", () => {
    for (const stage of STAGES) {
      expect(stage.range[1]).toBeGreaterThan(stage.range[0]);
    }
  });

  it("uses unique ids", () => {
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(STAGES.length);
  });

  it("gives every stage a label, a title, and real body copy", () => {
    for (const stage of STAGES) {
      expect(stage.label.length).toBeGreaterThan(0);
      expect(stage.title.length).toBeGreaterThan(0);
      // Long enough to be an actual explanation rather than a caption.
      expect(stage.body.length).toBeGreaterThan(80);
    }
  });

  it("contains no placeholder copy anywhere", () => {
    const banned = /lorem|ipsum|todo|tbd|placeholder|coming soon|xxx|\bfoo\b|\bbar\b/i;
    for (const stage of STAGES) {
      expect(`${stage.label} ${stage.title} ${stage.body}`).not.toMatch(banned);
    }
  });
});

describe("stageAt", () => {
  it("resolves progress inside a range to that stage", () => {
    expect(stageAt(0.05).id).toBe("rest");
    expect(stageAt(0.2).id).toBe("dom");
    expect(stageAt(0.4).id).toBe("box");
    expect(stageAt(0.6).id).toBe("paint");
    expect(stageAt(0.8).id).toBe("composite");
    expect(stageAt(0.95).id).toBe("recompose");
  });

  it("treats a boundary as the start of the next stage", () => {
    expect(stageAt(0.1).id).toBe("dom");
    expect(stageAt(0.28).id).toBe("box");
  });

  it("resolves the endpoints", () => {
    expect(stageAt(0).id).toBe("rest");
    expect(stageAt(1).id).toBe("recompose");
  });

  it("clamps out-of-range progress instead of returning undefined", () => {
    expect(stageAt(-5).id).toBe("rest");
    expect(stageAt(42).id).toBe("recompose");
    expect(stageAt(NaN)).toBeDefined();
  });

  it("always resolves to some stage across the whole range", () => {
    for (let p = 0; p <= 1; p += 0.001) {
      expect(stageAt(p)).toBeDefined();
    }
  });
});
