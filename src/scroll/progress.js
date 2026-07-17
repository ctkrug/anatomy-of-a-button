/**
 * Scroll position -> 0..1 progress across the pinned sequence.
 *
 * The math is kept separate from the DOM wiring below it so it can be
 * unit-tested without a browser, and so nothing downstream needs to know how
 * progress was measured.
 */

/**
 * Progress across a section whose stage is pinned (position: sticky) for the
 * section's whole scroll range. It is 0 the moment the pin engages (section
 * top at viewport top) and 1 the moment it releases (section bottom at
 * viewport bottom), so progress maps exactly onto the span during which the
 * stage is actually stuck on screen.
 */
export function computePinProgress({ scrollY, sectionTop, sectionHeight, viewportHeight }) {
  const span = sectionHeight - viewportHeight;
  if (span <= 0) return 0;
  const raw = (scrollY - sectionTop) / span;
  if (!Number.isFinite(raw)) return 0;
  return Math.min(1, Math.max(0, raw));
}

/**
 * Wires computePinProgress up to real scroll/resize events for a
 * position: sticky sequence section and invokes onProgress(value) on every
 * change. Returns a cleanup function that removes both listeners.
 */
export function attachPinProgress(sectionEl, onProgress) {
  const update = () => {
    const rect = sectionEl.getBoundingClientRect();
    const sectionTop = rect.top + window.scrollY;
    onProgress(
      computePinProgress({
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
