# Architecture

A concise map of the codebase for anyone (including a future run with fresh context) picking
this up. See `docs/VISION.md` for what this is and why, and `docs/DESIGN.md` for the visual
direction and tokens.

## Data flow

```
scroll event
  -> attachPinProgress (src/scroll/progress.js)
     measures #sequence's position against the viewport via computePinProgress
  -> progress: number (0..1)
  -> computeScene(progress, { promoted }) (src/scene/scene.js)
     pure function: progress + promoted -> every value the DOM needs
  -> render(scene) (src/render/renderer.js)
     writes CSS custom properties / opacity / dataset attrs onto pre-built DOM
```

Nothing in this chain does its own DOM construction on scroll — `mount()` builds the plane
groups, annotation figures, and DOM-tree SVG exactly once; every subsequent frame is `render()`
writing style properties onto that already-built structure. This is what keeps scrolling cheap
(no layout thrash, no node creation per frame) and keeps the whole sequence reversible: scene.js
has no memory of direction, so scrolling up produces exactly the frames scrolling down did.

## Modules

- **`src/scroll/progress.js`** — `computePinProgress`, the pure math mapping a scroll position
  onto the span during which the sticky stage is actually pinned, plus `attachPinProgress`, the
  thin DOM wiring that turns real scroll/resize events into a progress callback and returns a
  cleanup function. This is the only way progress is measured.
- **`src/scene/easing.js`** — Scroll-scrubbed (not time-based) shaping helpers: `clamp`, `lerp`,
  `easeInOutCubic`, `envelope` (a 0→1→0 hump over a progress range — the basis for "explode then
  recompose"), and `fadeBand` (envelope with explicit fade widths, used for group/annotation
  opacity).
- **`src/scene/stages.js`** — `STAGES`: the six pipeline stages (rest, dom, box, paint,
  composite, recompose), each with a contiguous `[start, end)` progress range and its real
  annotation copy. `stageAt(progress)` resolves which stage owns a given progress value.
- **`src/scene/scene.js`** — `computeScene(progress, { promoted })`: the pure progress-to-visuals
  model. Combines envelopes/bands to produce deck tilt/scale, per-group opacity, per-layer z
  offsets (`BOX_LAYERS`, `PAINT_LAYERS`, `COMPOSITE_LAYERS`), and per-annotation opacity. This is
  the one function a new visual stage or timing change should touch first.
- **`src/render/dom-tree.js`** — Builds the DOM-tree SVG plane (`createDomTree`): a small
  parent/sibling diagram with a drop line onto the real subject button, from static
  `TREE_NODES`/`TREE_EDGES` data. Built once at mount; never touched per frame.
- **`src/render/planes.js`** — Builds one absolutely-positioned "plane" element per box-model
  box / paint operation / compositor layer (`createPlaneGroup`), each labelled via
  `plane-label`/`plane-label-name`/`plane-label-note`. Built once at mount. Each layer's label
  defaults to vertically centered on its own plane (`top: 50%`), which overlaps illegibly once
  more than one layer is in view — every group in `style.css` gives each `[data-layer]` a fixed
  `calc(50% ± Npx)` offset instead. A new layer added to a group needs its own offset too.
- **`src/render/renderer.js`** — `mount(root)` wires dom-tree + plane groups + annotation
  figures into the stage's `[data-deck]`/`[data-annotations]`/`[data-subject]` structure and
  returns `{ render }`. `render(scene)` is the only thing that runs per scroll frame: it writes
  `--rotate-x`/`--rotate-z`/`--deck-scale`/`--z` custom properties and opacity/display, and sets
  `root.dataset.stage`/`root.dataset.promoted` so CSS can react to the current stage (e.g. the
  promote-toggle's visibility, the hero-copy fade).
- **`src/main.js`** — The entry point: mounts the renderer onto `#stage`, wires
  `attachPinProgress` on `#sequence` to drive `computeScene`, and wires the promote-toggle
  button's click handler to the `promoted` option.
- **`src/style.css`** — All styling; see `docs/DESIGN.md` for the token values and direction.
  Notable non-obvious bits: `.stage` pins via `position: sticky` inside a tall `.sequence`
  (600vh) track; no ancestor of `.stage` may set `overflow-x` without also being the document
  root, or it silently breaks the sticky pin (see the comment above `#app` in style.css); the
  `.annotations` children all share one CSS Grid area so the container auto-sizes to the
  tallest stage's copy while the figures still crossfade in place. `.annotations` and
  `.promote-toggle` are wrapped in `.stage-aside` (index.html) rather than placed as two
  independent grid items — two column-2 items with no `grid-row` set auto-place onto separate
  implicit rows, which pulls `.scene`'s vertical center off the true stage middle.
- **Hero sizing (`--explode-scale`/`--explode-boost`)** — `.stage` declares `--btn-w`/`--btn-h`
  as viewport-relative `clamp()`s (not `.deck`, so both `.deck` and `.scene`'s own responsive
  margin can read them — a custom property only cascades to descendants) and derives
  `--explode-scale: calc(var(--btn-w) / 176px)`, 176px being the original literal-button
  reference size every box-model/paint/composite offset in `scene.js` was tuned against. `.plane`
  multiplies `--expand-x`/`--expand-y`/`--z` by `--explode-scale`, and every per-layer label's
  `top: calc(50% ± Npx)` offset multiplies by it too, so layer separation grows with the deck
  instead of shrinking to a rounding error at hero size. `--explode-boost` (default 1) is a
  *second*, group-scoped multiplier — the composite group needs one because unpromoted its two
  layers sit at the same z depth by design (no separation to scale via `--explode-scale` alone).
  It must be a separate custom property: `--explode-scale: calc(var(--explode-scale) * n)` on a
  descendant is a self-reference per the custom-properties spec (guaranteed-invalid, silently
  falls back to the `var()` default) even though it reads like a harmless per-element override.
  Below 1024px, `.scene` and `.annotations` stack in normal flow instead of sitting in separate
  grid columns; `.scene`'s own layout box is only the deck's small footprint, so it gets a
  `margin-bottom` scaled by `--explode-scale` to clear the exploded planes that visually overflow
  past it. `.scene` also scales down as a unit below 1024px (two tiers: phone/tablet), and below
  1024px `.plane-label` wraps rather than staying `nowrap` — a fixed-width label that's fine at
  desktop can run past a narrow viewport's edge and get silently clipped by `.stage`'s
  `overflow: hidden` (no scrollbar, so nothing but a real screenshot catches it).

## How to run

- `npm run dev` — Vite dev server.
- `npm test` — `vitest run`, the full suite (pure logic + jsdom-based renderer/main tests).
- `npm run coverage` — `vitest run --coverage` (v8 provider); core logic and render modules run
  at 100% line and function coverage.
- `npm run lint` — ESLint over `src/` and `test/`.
- `npm run build` — static production build into `dist/`, relative-path (`base: "./"`) so it's
  deployable to a subpath (`apps.charliekrug.com/anatomy-of-a-button`) with no server.
- `npm run preview` — serves the built `dist/` locally.

## Testing notes

Unit tests (vitest + jsdom) cover the pure logic thoroughly (`easing`, `stages`, `scene`,
`progress`/`pin-progress`, `dom-tree`, `renderer`) plus DOM-wiring smoke tests for `main.js`.
jsdom does not perform real layout, so it cannot catch layout-only bugs (e.g. an ancestor's
`overflow-x` silently breaking `position: sticky`, content overflowing a fixed-height
container, a CSS shorthand like `inset` silently resetting longhands declared earlier in the
same rule, or plane labels overlapping because they're too close together in a small box) —
those were caught across three runs via a real headless-Chromium pass (Playwright) across
390/768/1440 at every pipeline stage, not by the test suite. Any future layout-sensitive change
should get the same real-browser check, not just `npm test` — this run in particular found a
grid auto-placement bug, a self-referencing custom property that silently no-opped, and two
distinct off-screen label clipping bugs, none of which a passing test suite or a `scrollWidth`
overflow check surfaced; only rendered screenshots did.
