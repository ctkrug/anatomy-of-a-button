import { describe, expect, it } from "vitest";
import { BOX_LAYERS, COMPOSITE_LAYERS, computeScene, isAtRest, PAINT_LAYERS } from "../src/scene/scene.js";
import { STAGES } from "../src/scene/stages.js";

/** Every numeric leaf of a scene, flattened, for continuity comparisons. */
function numbers(scene) {
  const out = [];
  const walk = (value) => {
    if (typeof value === "number") out.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(scene);
  return out;
}

describe("computeScene — resting state (stories 1.1, 2.3)", () => {
  it("is at rest at progress 0", () => {
    expect(isAtRest(computeScene(0))).toBe(true);
  });

  it("is at rest at progress 1", () => {
    expect(isAtRest(computeScene(1))).toBe(true);
  });

  it("renders identically at progress 0 and progress 1", () => {
    // The acceptance criterion for the recomposition: the final frame is the
    // initial frame, not merely close to it.
    const first = computeScene(0);
    const last = computeScene(1);
    expect(last.deck).toEqual(first.deck);
    expect(last.groups).toEqual(first.groups);
    expect(last.separation).toEqual(first.separation);
    expect(last.boxLayers.map((l) => l.z)).toEqual(first.boxLayers.map((l) => l.z));
    expect(last.paintLayers.map((l) => l.z)).toEqual(first.paintLayers.map((l) => l.z));
  });

  it("shows the button fully and every exploded group hidden at both ends", () => {
    for (const p of [0, 1]) {
      const scene = computeScene(p);
      expect(scene.groups.button).toBe(1);
      expect(scene.groups.domTree).toBe(0);
      expect(scene.groups.boxModel).toBe(0);
      expect(scene.groups.paint).toBe(0);
      expect(scene.groups.composite).toBe(0);
      expect(scene.deck.rotateX).toBe(0);
      expect(scene.deck.scale).toBe(1);
    }
  });

  it("collapses every layer back to zero separation at both ends", () => {
    for (const p of [0, 1]) {
      const scene = computeScene(p);
      for (const layer of [...scene.boxLayers, ...scene.paintLayers, ...scene.compositeLayers]) {
        expect(layer.z).toBe(0);
      }
    }
  });
});

describe("computeScene — reversibility and continuity (story 1.1)", () => {
  it("is a pure function of progress — same input, same output", () => {
    expect(computeScene(0.43)).toEqual(computeScene(0.43));
  });

  it("scrubbing backwards reproduces the forward scene exactly", () => {
    const forward = [];
    for (let p = 0; p <= 1.00001; p += 0.01) forward.push(computeScene(p));
    const backward = [];
    for (let p = 1; p >= -0.00001; p -= 0.01) backward.push(computeScene(Math.max(0, p)));
    backward.reverse();
    expect(backward.length).toBe(forward.length);
    forward.forEach((scene, i) => {
      expect(backward[i].deck.rotateX).toBeCloseTo(scene.deck.rotateX, 6);
      expect(backward[i].groups.button).toBeCloseTo(scene.groups.button, 6);
    });
  });

  it("never jump-cuts: no numeric value leaps between adjacent scroll steps", () => {
    const step = 0.002;
    let previous = numbers(computeScene(0));
    for (let p = step; p <= 1; p += step) {
      const current = numbers(computeScene(p));
      expect(current.length).toBe(previous.length);
      current.forEach((value, i) => {
        // Mixed units: the largest movers are layer z offsets (up to ~105px
        // over a 0.16-wide ramp, so ~4px per step here). A jump cut would be
        // a whole layer's depth appearing at once, an order of magnitude more.
        expect(Math.abs(value - previous[i])).toBeLessThan(8);
      });
      previous = current;
    }
  });

  it("tilts the deck through the middle of the sequence but not at the ends", () => {
    expect(computeScene(0.5).deck.rotateX).toBeLessThan(-20);
    expect(computeScene(0).deck.rotateX).toBe(0);
    expect(computeScene(1).deck.rotateX).toBe(0);
  });
});

describe("computeScene — stage progression", () => {
  it("reports the stage matching the progress", () => {
    expect(computeScene(0.02).stageId).toBe("rest");
    expect(computeScene(0.2).stageId).toBe("dom");
    expect(computeScene(0.4).stageId).toBe("box");
    expect(computeScene(0.6).stageId).toBe("paint");
    expect(computeScene(0.8).stageId).toBe("composite");
    expect(computeScene(0.95).stageId).toBe("recompose");
  });

  it("gives each stage a moment where its own group is the visible one", () => {
    expect(computeScene(0.2).groups.domTree).toBeGreaterThan(0.9);
    expect(computeScene(0.42).groups.boxModel).toBeGreaterThan(0.9);
    expect(computeScene(0.64).groups.paint).toBeGreaterThan(0.9);
    expect(computeScene(0.82).groups.composite).toBeGreaterThan(0.9);
  });

  it("separates the box model continuously rather than snapping (story 1.3)", () => {
    const samples = [0.3, 0.34, 0.38, 0.42].map((p) => computeScene(p).separation.boxModel);
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    }
    // A snap between two fixed states would only ever produce 0 or 1.
    expect(samples.some((v) => v > 0 && v < 1)).toBe(true);
  });

  it("keeps every opacity and separation within [0, 1] across the sequence", () => {
    for (let p = 0; p <= 1; p += 0.005) {
      const scene = computeScene(p);
      for (const value of [...Object.values(scene.groups), ...Object.values(scene.separation)]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("never leaves the viewer with nothing on screen", () => {
    for (let p = 0; p <= 1; p += 0.005) {
      const { groups } = computeScene(p);
      const total =
        groups.button + groups.domTree + groups.boxModel + groups.paint + groups.composite;
      expect(total).toBeGreaterThan(0.25);
    }
  });
});

describe("computeScene — layer ordering", () => {
  it("stacks box layers with content nearest the viewer, margin furthest", () => {
    const scene = computeScene(0.46);
    const byId = Object.fromEntries(scene.boxLayers.map((l) => [l.id, l.z]));
    expect(byId.content).toBeGreaterThan(byId.padding);
    expect(byId.padding).toBeGreaterThan(byId.border);
    expect(byId.border).toBeGreaterThan(byId.margin);
  });

  it("stacks paint layers in spec paint order, text in front", () => {
    const scene = computeScene(0.66);
    const byId = Object.fromEntries(scene.paintLayers.map((l) => [l.id, l.z]));
    expect(byId.text).toBeGreaterThan(byId.border);
    expect(byId.border).toBeGreaterThan(byId.background);
    expect(byId.background).toBeGreaterThan(byId.shadow);
  });

  it("labels every layer with its name and a note", () => {
    for (const layer of [...BOX_LAYERS, ...PAINT_LAYERS, ...COMPOSITE_LAYERS]) {
      expect(layer.label.length).toBeGreaterThan(0);
      expect(layer.note.length).toBeGreaterThan(0);
    }
  });
});

describe("computeScene — layer promotion toggle (story 2.2)", () => {
  it("defaults to unpromoted", () => {
    expect(computeScene(0.82).promoted).toBe(false);
  });

  it("lifts the button out of the document layer only when promoted", () => {
    const at = (promoted) => {
      const scene = computeScene(0.85, { promoted });
      return Object.fromEntries(scene.compositeLayers.map((l) => [l.id, l.z]));
    };
    const off = at(false);
    const on = at(true);
    expect(off.button).toBe(off.document);
    expect(on.button).toBeGreaterThan(on.document);
  });

  it("keeps both states at rest when the sequence is collapsed", () => {
    expect(isAtRest(computeScene(0, { promoted: true }))).toBe(true);
    expect(isAtRest(computeScene(1, { promoted: true }))).toBe(true);
  });

  it("ignores a non-boolean promoted option rather than coercing it", () => {
    expect(computeScene(0.8, { promoted: "yes" }).promoted).toBe(false);
    expect(computeScene(0.8, {}).promoted).toBe(false);
  });
});

describe("computeScene — annotations (story 3.2)", () => {
  it("emits one annotation per stage, carrying its copy", () => {
    const scene = computeScene(0.5);
    expect(scene.annotations.map((a) => a.id)).toEqual(STAGES.map((s) => s.id));
    for (const annotation of scene.annotations) {
      expect(annotation.title.length).toBeGreaterThan(0);
      expect(annotation.body.length).toBeGreaterThan(0);
    }
  });

  it("always has at least one annotation legible on screen", () => {
    for (let p = 0; p <= 1; p += 0.005) {
      const best = Math.max(...computeScene(p).annotations.map((a) => a.opacity));
      expect(best).toBeGreaterThan(0.4);
    }
  });

  it("shows the annotation belonging to the current stage most strongly", () => {
    for (const [p, id] of [
      [0.04, "rest"],
      [0.19, "dom"],
      [0.39, "box"],
      [0.6, "paint"],
      [0.79, "composite"],
      [0.96, "recompose"],
    ]) {
      const scene = computeScene(p);
      const strongest = scene.annotations.reduce((a, b) => (b.opacity > a.opacity ? b : a));
      expect(strongest.id).toBe(id);
    }
  });
});

describe("computeScene — malformed input", () => {
  it("clamps out-of-range progress to the resting ends", () => {
    expect(isAtRest(computeScene(-2))).toBe(true);
    expect(isAtRest(computeScene(50))).toBe(true);
  });

  it("falls back to rest for a non-finite progress instead of emitting NaN", () => {
    for (const bad of [NaN, Infinity, -Infinity, undefined, null, "0.5"]) {
      const scene = computeScene(bad);
      expect(Number.isFinite(scene.progress)).toBe(true);
      expect(numbers(scene).every(Number.isFinite)).toBe(true);
    }
  });

  it("tolerates a missing options argument", () => {
    expect(() => computeScene(0.5)).not.toThrow();
  });
});
