# Backlog

Epics and stories for the build phase. Every story lists concrete, verifiable acceptance
criteria — a later run should be able to check each one true/false without guessing at "vibes."

## Epic 1 — The wow moment: scroll-driven exploded pipeline

- [ ] **1.1 — Build the full scroll sequence (WOW MOMENT).** From the resting button, scrolling
      drives it through a box-model expansion, paint-layer separation, and
      compositing/GPU-layer separation, then back to the resting button — one continuous,
      reversible sequence.
  - Scrolling from the top to the bottom of the sequence interpolates through every stage with
    no popping or jump cuts between stages.
  - Scrolling back up exactly reverses the sequence (driven by `computeProgress`, not a one-shot
    timed animation).
  - At scroll progress 0 and progress 1 the button renders identically to its resting state
    (same size, position, and style).
- [ ] **1.2 — Pin the stage during the scroll sequence.** The stage stays visually fixed in the
      viewport for the length of the scrollytelling section instead of scrolling away mid-stage.
  - The stage element remains pinned within the viewport for the full scroll range of the
    sequence section.
  - Scrolling past the end of the sequence releases the pin and resumes normal document scroll.
- [ ] **1.3 — Box-model exploded view.** Content, padding, border, and margin separate into a
      distinct, labeled, 3D-ish layered view driven by scroll progress.
  - Each of the four box regions renders as a visually distinct, labeled layer.
  - Layer separation distance changes continuously with scroll progress within this sub-range
    (not a snap between two fixed states).

## Epic 2 — Paint & compositing detail

- [ ] **2.1 — Paint layer separation.** Background, border, text, and box-shadow render and
      separate as independently painted layers.
  - Each paint layer renders as its own visual plane that floats apart from the others mid-
    sequence.
  - Each layer is labeled with its paint-order name (e.g. "background", "border", "text").
- [ ] **2.2 — Compositing / GPU layer section.** Explains why `transform`/`opacity`/
      `will-change` promote an element to its own GPU layer.
  - A toggle lets the reader compare a "no promoted layer" state against a "promoted layer"
    state for the same element.
  - Annotation copy explains, in plain language, at least one concrete cost and one concrete
    benefit of layer promotion.
- [ ] **2.3 — Recomposition.** All separated layers snap back together into the exact original
      button at the end of the sequence.
  - The final resting frame is visually identical to the initial resting frame (same computed
    style/position, not just "close").
  - The return transition reads as continuous with the rest of the sequence — no separate
    "reset" animation or cut.

## Epic 3 — Annotation & narrative content

- [ ] **3.1 — DOM tree reveal.** The button appears as a node inside a small element tree
      (parent/siblings) before the box-model stage begins.
  - The button's ancestor/sibling structure renders as an SVG tree diagram.
  - The diagram appears and fades per the scroll progress of its own section, not as a static
    always-visible element.
- [ ] **3.2 — Scroll-scrubbed annotation copy for every stage.** Each pipeline stage gets real,
      plain-language explanatory text, not just a label.
  - Every stage (DOM, box model, paint, compositing) has its own annotation copy explaining
    what's shown and why it matters practically.
  - No placeholder or lorem-ipsum copy exists anywhere in the shipped sequence.
- [ ] **3.3 — Design polish: narrative sections.** Annotation typography and callouts match the
      blueprint direction in `docs/DESIGN.md`.
  - Annotation type, color, and spacing use the tokens defined in `docs/DESIGN.md` (no ad hoc
    colors/fonts introduced).
  - A squint test shows a clear hierarchy between heading, body, and label text in every
    section.

## Epic 4 — Responsive, accessibility & ship readiness

- [ ] **4.1 — Responsive layout.** The full sequence composes correctly at phone, tablet, and
      desktop widths.
  - No horizontal scroll or element overlap at 390px, 768px, or 1440px viewport widths.
  - The stage remains the dominant visual element at all three widths, per `docs/DESIGN.md`'s
    layout intent.
- [ ] **4.2 — Reduced motion & accessibility pass.**
  - `prefers-reduced-motion: reduce` disables non-essential animation (e.g. the hero scroll
    hint) while the scroll-driven content itself remains fully functional.
  - Every interactive control has a visible focus state, and body text meets ≥4.5:1 contrast.
- [ ] **4.3 — Verify the static build is subpath-deployable.**
  - `npm run build` output references only relative asset paths (no leading `/`).
  - The built `dist/` renders correctly when served from a non-root path locally (e.g. a local
    static server rooted one directory above `dist/`).
- [ ] **4.4 — Design polish: full sequence review.**
  - A full scroll-through at 390px, 768px, and 1440px shows no anti-generic-ban violations
    (§D2 of the design standard) anywhere in the sequence.
  - The favicon, wordmark, and blueprint grid treatment are present and consistent across the
    entire page, not just the hero section.
