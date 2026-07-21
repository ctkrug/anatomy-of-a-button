/**
 * The scene model: a pure function from scroll progress to every value the
 * renderer needs. Nothing here touches the DOM, so the entire sequence —
 * including the guarantee that it returns to rest — is unit-testable.
 *
 * The whole sequence is built from envelopes (see ./easing.js). Every
 * separation and tilt is a 0 -> n -> 0 hump, so progress 0 and progress 1
 * both produce byte-identical rest scenes with no reset step.
 */

import { envelope, fadeBand, lerp } from "./easing.js";
import { STAGES, stageAt } from "./stages.js";

/** Deck tilt at full explode, in degrees. */
const TILT_X = -24;
const TILT_Z = -13;

/**
 * Multiplying a negative constant by a zero envelope yields -0, which breaks
 * the "progress 0 and 1 are the same frame" identity under Object.is even
 * though it looks the same. Normalise it away at the source.
 */
function scaleBy(value, factor) {
  const result = value * factor;
  return result === 0 ? 0 : result;
}

const TILT_BAND = { start: 0.1, peakStart: 0.34, peakEnd: 0.86, end: 1 };
const BUTTON_HIDE_BAND = { start: 0.24, peakStart: 0.32, peakEnd: 0.9, end: 0.985 };

const GROUP_BANDS = {
  domTree: { band: { start: 0.08, end: 0.34, fade: 0.06 } },
  boxModel: { band: { start: 0.26, end: 0.56, fade: 0.05 } },
  paint: { band: { start: 0.48, end: 0.78, fade: 0.05 } },
  composite: { band: { start: 0.72, end: 0.96, fade: 0.05 } },
};

const SEPARATION_BANDS = {
  boxModel: { start: 0.28, peakStart: 0.44, peakEnd: 0.48, end: 0.56 },
  paint: { start: 0.5, peakStart: 0.64, peakEnd: 0.68, end: 0.78 },
  composite: { start: 0.72, peakStart: 0.82, peakEnd: 0.88, end: 0.96 },
};

/**
 * The four boxes CSS layout resolves, outermost first so they paint back to
 * front. `expandX`/`expandY` are offsets from the button's border box in px;
 * `depth` is the z offset at full separation (content nearest the viewer).
 */
export const BOX_LAYERS = [
  { id: "margin", label: "margin", note: "holds neighbours away", expandX: 24, expandY: 24, depth: -105 },
  { id: "border", label: "border", note: "1px solid", expandX: 0, expandY: 0, depth: -35 },
  { id: "padding", label: "padding", note: "16px 32px", expandX: -1, expandY: -1, depth: 35 },
  { id: "content", label: "content", note: 'the text "Click me"', expandX: -33, expandY: -17, depth: 105 },
];

/** Paint operations in spec order, back to front. */
export const PAINT_LAYERS = [
  { id: "shadow", label: "box-shadow", note: "drawn first, outside the box", depth: -105 },
  { id: "background", label: "background", note: "fills the padding box", depth: -35 },
  { id: "border", label: "border", note: "drawn over the background edge", depth: 35 },
  { id: "text", label: "text", note: "always last — nothing can cover it", depth: 105 },
];

/** The two compositor layers the promotion toggle compares. */
export const COMPOSITE_LAYERS = [
  { id: "document", label: "document layer", note: "everything else on the page", depth: -80 },
  { id: "button", label: "button layer", note: "promoted to its own texture", depth: 80 },
];

/**
 * Where an unpromoted button sits: on the document's own layer, not a texture
 * of its own. Derived from the document layer so the two depths cannot drift
 * apart and silently leave a gap that reads as a promotion that didn't happen.
 */
const SHARED_LAYER_DEPTH = COMPOSITE_LAYERS.find((layer) => layer.id === "document").depth;

/**
 * Builds the scene for a given progress.
 *
 * @param {number} progress 0..1 across the pinned sequence.
 * @param {{promoted?: boolean}} [options] promoted mirrors the compositing
 *   section's toggle: whether the button gets its own GPU layer.
 */
export function computeScene(progress, options = {}) {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const promoted = options?.promoted === true;

  const tilt = envelope(p, TILT_BAND);
  const separation = {
    boxModel: envelope(p, SEPARATION_BANDS.boxModel),
    paint: envelope(p, SEPARATION_BANDS.paint),
    composite: envelope(p, SEPARATION_BANDS.composite),
  };

  const groups = {
    button: 1 - envelope(p, BUTTON_HIDE_BAND),
    domTree: fadeBand(p, GROUP_BANDS.domTree.band),
    boxModel: fadeBand(p, GROUP_BANDS.boxModel.band),
    paint: fadeBand(p, GROUP_BANDS.paint.band),
    composite: fadeBand(p, GROUP_BANDS.composite.band),
  };

  return {
    progress: p,
    stageId: stageAt(p).id,
    promoted,
    deck: {
      rotateX: scaleBy(TILT_X, tilt),
      rotateZ: scaleBy(TILT_Z, tilt),
      // Pull the deck back slightly as it explodes so the spread layers stay
      // inside the stage instead of growing past its edges.
      scale: lerp(1, 0.82, tilt),
    },
    groups,
    separation,
    boxLayers: BOX_LAYERS.map((layer) => ({
      ...layer,
      z: scaleBy(layer.depth, separation.boxModel),
    })),
    paintLayers: PAINT_LAYERS.map((layer) => ({
      ...layer,
      z: scaleBy(layer.depth, separation.paint),
    })),
    compositeLayers: COMPOSITE_LAYERS.map((layer) => ({
      ...layer,
      // Unpromoted, the button shares the document's layer: it sits at the
      // same depth rather than lifting out into a texture of its own.
      z: scaleBy(
        layer.id === "button" && !promoted ? SHARED_LAYER_DEPTH : layer.depth,
        separation.composite,
      ),
    })),
    annotations: STAGES.map((stage, index) => ({
      id: stage.id,
      label: stage.label,
      title: stage.title,
      body: stage.body,
      // Bands are widened past each stage's own range so consecutive
      // annotations crossfade instead of both hitting zero at the boundary.
      // The first and last stages extend past the sequence ends so the reader
      // is never left looking at a stage with no copy at progress 0 or 1.
      opacity: fadeBand(p, {
        start: stage.range[0] - (index === 0 ? 0.08 : 0.025),
        end: stage.range[1] + (index === STAGES.length - 1 ? 0.08 : 0.025),
        fade: 0.035,
      }),
    })),
  };
}

/** True when the scene is visually at rest: the plain button, nothing exploded. */
export function isAtRest(scene) {
  return (
    scene.deck.rotateX === 0 &&
    scene.deck.rotateZ === 0 &&
    scene.deck.scale === 1 &&
    scene.groups.button === 1 &&
    scene.groups.domTree === 0 &&
    scene.groups.boxModel === 0 &&
    scene.groups.paint === 0 &&
    scene.groups.composite === 0
  );
}
