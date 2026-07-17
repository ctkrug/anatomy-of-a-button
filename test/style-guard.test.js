import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { COMPOSITE_LAYERS } from "../src/scene/scene.js";

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), "../src/style.css");
const css = readFileSync(cssPath, "utf8");

/**
 * The largest --explode-scale the clamp() in .stage can ever produce
 * (--btn-w's clamp() ceiling of 680px, divided by the 176px reference size).
 */
const MAX_EXPLODE_SCALE = 680 / 176;

/**
 * COMPOSITE_LAYERS' depth magnitude — the value the boost below multiplies.
 * Read from the scene model rather than copied, so raising a layer's depth
 * re-runs this guard against the real number instead of a stale duplicate.
 */
const COMPOSITE_DEPTH = Math.max(...COMPOSITE_LAYERS.map((layer) => Math.abs(layer.depth)));

/** .scene's declared perspective (see src/style.css). */
const PERSPECTIVE = 1400;

/**
 * A promoted composite plane's translate3d z must stay well clear of the
 * perspective distance: as z approaches it, the CSS 3D projection's
 * magnification (perspective / (perspective - z)) diverges, which is what
 * sent the promoted button layer's rendered box to y 1033-1480 in a 900px
 * viewport (--explode-boost: 3.0 previously gave ~864px of z here). Capping
 * the magnification at 1.5x keeps the promoted layer comfortably inside any
 * viewport this deck size targets.
 */
const MAX_SAFE_MAGNIFICATION = 1.5;

function readCustomProperty(selector, property) {
  const block = css.match(new RegExp(`${selector.replace(/[.[\]]/g, "\\$&")}\\s*{([^}]*)}`));
  if (!block) throw new Error(`selector not found in style.css: ${selector}`);
  const match = block[1].match(new RegExp(`${property}:\\s*([\\d.]+)`));
  if (!match) throw new Error(`${property} not declared on ${selector}`);
  return Number(match[1]);
}

describe("style.css composite explode-boost", () => {
  it("keeps the promoted button layer's z-translate safely inside the perspective volume", () => {
    const boost = readCustomProperty(".plane-group-composite", "--explode-boost");
    const z = COMPOSITE_DEPTH * MAX_EXPLODE_SCALE * boost;
    const magnification = PERSPECTIVE / (PERSPECTIVE - z);

    expect(z).toBeLessThan(PERSPECTIVE);
    expect(magnification).toBeLessThan(MAX_SAFE_MAGNIFICATION);
  });
});
