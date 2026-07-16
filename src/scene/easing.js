/**
 * Pure easing/shaping helpers for the scroll sequence.
 *
 * Everything here is a function of scroll progress only — never of elapsed
 * time — so scrolling back up reverses the sequence exactly (docs/VISION.md,
 * "Scroll-scrubbed, not animation-timed").
 */

/** Clamps a value into [min, max]. */
export function clamp(value, min = 0, max = 1) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation from a to b at t, with t clamped to [0, 1]. */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t);
}

/**
 * Smooth acceleration and deceleration. Used for stage transitions so layers
 * ease apart rather than starting and stopping abruptly at a range boundary.
 */
export function easeInOutCubic(t) {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** Gentle deceleration — the default for a value settling into place. */
export function easeOutCubic(t) {
  const x = clamp(t);
  return 1 - Math.pow(1 - x, 3);
}

/**
 * A 0 → 1 → 0 hump: ramps up over [start, peakStart], holds at 1 across the
 * plateau, then ramps back down over [peakEnd, end]. This is what makes the
 * sequence return to rest — the explode amount is an envelope, so progress 0
 * and progress 1 both land on exactly 0 rather than needing a reset step.
 */
export function envelope(progress, { start, peakStart, peakEnd, end }) {
  const p = clamp(progress);
  if (p <= start || p >= end) return 0;
  if (p < peakStart) {
    return easeInOutCubic((p - start) / (peakStart - start));
  }
  if (p <= peakEnd) return 1;
  return easeInOutCubic(1 - (p - peakEnd) / (end - peakEnd));
}

/**
 * Opacity for something that fades in, stays, and fades out — the same shape
 * as envelope() but with explicit fade widths, which reads more naturally at
 * the call site for a stage's visibility than four boundary points.
 */
export function fadeBand(progress, { start, end, fade = 0.04 }) {
  return envelope(progress, {
    start,
    peakStart: Math.min(start + fade, (start + end) / 2),
    peakEnd: Math.max(end - fade, (start + end) / 2),
    end,
  });
}
