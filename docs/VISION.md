# Vision

## The problem

Every web developer has typed `<button>Click me</button>` and moved on. What that one line
actually costs the browser — building a DOM node, resolving styles, computing a box, painting
pixels, promoting layers, and compositing them on the GPU — is invisible by design. That
invisibility is good for shipping software and bad for understanding it: developers debug
layout thrashing, jank, and "why did this repaint" issues with only a hazy mental model of the
pipeline underneath.

Existing explanations of browser rendering are either dense engineering blog posts (correct,
but static prose walls) or superficial "here's how browsers work" diagrams (approachable, but
too shallow to build real intuition). Nothing lets you *feel* the pipeline by directly
manipulating it.

## Who it's for

Web developers and computer-curious learners who are comfortable with HTML/CSS basics and want
their mental model of "what happens after I hit save" to go from hand-wavy to concrete. Not
aimed at browser engine implementers — aimed at the much larger audience of people who use the
platform daily and have never seen its insides.

## The core idea

One button. One continuous scroll. The button never changes what it *is* — it changes how much
of its own machinery is visible around it as you scroll:

1. **It's just a button.** The familiar, boring gray rectangle everyone has seen a million
   times, sitting at rest.
2. **The DOM.** The button is revealed to be a node in a tree, with siblings and a parent,
   because rendering starts with structure, not pixels.
3. **The box model.** Content, padding, border, and margin expand outward into a 3D-ish
   exploded view — the box the button actually occupies is bigger and more structured than the
   rectangle you see.
4. **Paint.** The box separates into distinct painted layers — background, border, text,
   shadow — each rendered independently before they're flattened together.
5. **Compositing & GPU layers.** The layers lift further apart and are shown compositing on the
   GPU, with a nod to *why* (`transform`, `opacity`, `will-change`) some elements get their own
   layer and what that trade-off buys and costs.
6. **Recomposition.** Everything snaps back together into the exact same boring gray button
   you started with — and it should no longer look boring.

The scroll position is the only input. There's no "next" button, no separate slides — one
continuous, reversible scrub through the pipeline, so the relationship between "how far you've
scrolled" and "how deep into the rendering pipeline you are" is direct and physical.

## Key design decisions

- **Scroll-scrubbed, not animation-timed.** Every visual transition is a pure function of
  scroll progress (see `src/scroll/progress.js`), not a timer. Scrolling up must reverse the
  exact animation that scrolling down played, with no replay lag.
- **SVG for structure, CSS 3D transforms for every exploded layer.** The DOM tree is a
  DOM-adjacent structural diagram (SVG suits this). Box-model/paint/composite layers turned out
  not to need Canvas: `translate3d`/`rotateX`/`rotateZ` planes are real, independently
  GPU-composited layers driven by scroll-scrubbed custom properties — which is more honest to
  the compositing section's own subject matter than simulating layers on a raster canvas would
  be, and keeps every frame a style write with no per-frame redraw logic of its own.
- **No framework.** A framework's own virtual-DOM/render pipeline would sit awkwardly under a
  project that's explicitly about demystifying render pipelines. Vanilla JS keeps the metaphor
  honest and the bundle small.
- **Technically accurate over cute.** The concepts (box model, paint, compositing, GPU layers)
  are real Chromium/WebKit rendering-pipeline stages, simplified for clarity but not falsified.
  Where a simplification is made, it should be defensible to someone who's read the Chromium
  rendering docs.
- **One artifact, no backend.** Static site, no server, so it can be dropped at
  `apps.charliekrug.com/anatomy-of-a-button` with zero infrastructure.

## What "v1 done" looks like

- The full scroll sequence (button → DOM → box model → paint layers → compositing/GPU → back to
  button) is built, scroll-scrubbed in both directions, and matches `docs/DESIGN.md`.
- Each stage has a short, plain-language annotation explaining what's being shown and why it
  matters in practice (not just a label on a diagram).
- Works smoothly on a real desktop browser and doesn't break on a phone-width viewport (reflows
  to a stacked, still-legible layout — full parity with desktop motion isn't required).
- Ships as a static build with relative asset paths, deployable to a subpath with no server.
- No placeholder copy, no TODO diagrams — every stage in the sequence is real, not stubbed.
