/**
 * Pure math for turning a scroll position into a 0..1 progress value across
 * a section, so the calculation can be unit-tested without a DOM/browser.
 *
 * Progress is 0 the moment the section's top enters the bottom of the
 * viewport and 1 once the section has fully scrolled past the top.
 */
export function computeProgress({ scrollY, sectionTop, sectionHeight, viewportHeight }) {
  const start = sectionTop - viewportHeight;
  const end = sectionTop + sectionHeight;
  const span = end - start;
  if (span <= 0) return 0;
  const raw = (scrollY - start) / span;
  return Math.min(1, Math.max(0, raw));
}

/**
 * Progress across a section whose stage is pinned (position: sticky) for the
 * section's whole scroll range. Unlike computeProgress, this is 0 the moment
 * the pin engages (section top at viewport top) and 1 the moment it releases
 * (section bottom at viewport bottom), so progress maps exactly onto the span
 * during which the stage is actually stuck on screen.
 */
export function computePinProgress({ scrollY, sectionTop, sectionHeight, viewportHeight }) {
  const span = sectionHeight - viewportHeight;
  if (span <= 0) return 0;
  const raw = (scrollY - sectionTop) / span;
  return Math.min(1, Math.max(0, raw));
}

/**
 * Rescales a global 0..1 progress onto a [start, end] sub-range, clamped, so a
 * stage can be authored against its own local 0..1 timeline.
 */
export function subProgress(progress, start, end) {
  const span = end - start;
  if (span <= 0) return progress >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (progress - start) / span));
}

/**
 * Wires computeProgress up to real scroll/resize events for a section
 * element and invokes onProgress(value) on every change.
 */
export function attachScrollProgress(sectionEl, onProgress) {
  const update = () => {
    const rect = sectionEl.getBoundingClientRect();
    const sectionTop = rect.top + window.scrollY;
    onProgress(
      computeProgress({
        scrollY: window.scrollY,
        sectionTop,
        sectionHeight: rect.height,
        viewportHeight: window.innerHeight,
      }),
    );
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();

  return () => {
    window.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
  };
}
