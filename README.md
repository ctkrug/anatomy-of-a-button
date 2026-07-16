# Anatomy of a Button

[![CI](https://github.com/ctkrug/anatomy-of-a-button/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/anatomy-of-a-button/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An interactive, scroll-driven explainer that builds a single browser button from first
principles — DOM, box model, paint, compositing, and GPU layers — peeling each layer apart
live as you scroll.

## Why

"It's just a button" is doing a lot of hiding. Underneath one gray rectangle is a rendering
pipeline most developers use every day and rarely see: an element tree, a box model, paint
records, compositor layers, and a GPU that stitches it all back together thirty-plus times a
second. This project makes that pipeline visible and legible by tying it to the smallest,
most familiar UI element there is.

Scroll past "it's just a button" and the page peels it apart in front of you — the box model
expands into 3D, paint layers separate and float like an exploded-parts diagram, then
composite back into the boring gray button you started with. That's the moment this whole
project is built toward.

## Planned features

- A pinned scrollytelling stage where scroll position drives an SVG/Canvas rendering pipeline
  diagram, not just fades and slides.
- A box-model breakdown (content, padding, border, margin) that expands into an exploded 3D-ish
  view as you scroll into that section.
- A paint-layer separation sequence: background, border, text, and box-shadow shown as distinct
  painted layers before they recombine.
- A compositing / GPU-layer section that shows why `transform`/`opacity`/`will-change` promote
  an element to its own layer, and what that costs and buys you.
- Scroll-scrubbed annotations (blueprint-style callouts) that explain each stage in plain
  language alongside the diagram.
- A fully static, self-contained build with no server dependency, deployable to a subpath.

## Stack

- Vanilla JavaScript (ES modules) — no framework, so the rendering-pipeline metaphor isn't
  buried under a framework's own rendering pipeline.
- SVG for the structural/box-model diagrams, Canvas for layer-compositing visuals.
- [Vite](https://vitejs.dev/) for the dev server and static production build.
- [Vitest](https://vitest.dev/) for unit tests.
- ESLint for linting.

## Development

```sh
npm install
npm run dev      # local dev server
npm test         # run the test suite
npm run lint     # lint the source
npm run build    # produce the static production build in dist/
```

## Deployment

`npm run build` produces a fully static, self-contained site in `dist/` using only relative
asset paths, so it can be hosted at a domain root or dropped into a subpath (e.g.
`apps.charliekrug.com/anatomy-of-a-button`) with no server-side rendering or backend required.

## Docs

- [`docs/VISION.md`](docs/VISION.md) — problem, audience, core idea, what "v1 done" means.
- [`docs/DESIGN.md`](docs/DESIGN.md) — visual direction, tokens, and layout intent.
- [`docs/BACKLOG.md`](docs/BACKLOG.md) — epic/story breakdown for the build.

## License

MIT — see [LICENSE](LICENSE).
