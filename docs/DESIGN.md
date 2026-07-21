# Design

## Aesthetic direction

**Blueprint / technical.** Cutaway is a schematic of a browser button: a dark
navy "drafting table" background with a faint cyan grid, cyan ink lines for structure, and
warm orange for callouts and annotations — the visual language of an engineering blueprint or
a technical cutaway diagram, applied to something as mundane as a `<button>`. This direction
was chosen (over a generic dark-mode dev-tool look) because the content itself *is* a
cutaway/exploded-parts diagram — the blueprint metaphor is literal, not decorative, and it
reads as distinct from the dark-gray-cards-plus-accent look that's the default for most
technical explainers.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a1929` | Page background (deep blueprint navy) |
| `--surface-1` | `#0f2438` | Lower-elevation surfaces |
| `--surface-2` | `#16324a` | Raised surfaces (the subject button, cards) |
| `--text` | `#e8f1f8` | Primary text |
| `--text-muted` | `#7fa8c9` | Secondary text, annotations |
| `--accent` | `#4fd1e8` | Structural "ink" — lines, DOM/box-model diagrams, focus rings |
| `--accent-support` | `#ff8a5c` | Redline callouts — annotations, highlighted measurements |

- **Type pairing:** Display — **Space Grotesk** (700, geometric, technical) for the wordmark
  and headings. UI/body — **IBM Plex Mono** (400/500) for annotations, labels, and body copy,
  reinforcing the "engineering notes" feel. Both load from Google Fonts with system-ui/monospace
  fallbacks.
- **Spacing scale:** 8px unit — 8 / 16 / 24 / 32 / 48 / 64.
- **Corner radius:** 2px. Sharp and drafted, not soft — blueprints don't have rounded corners.
- **Shadow/glow:** No drop shadows for depth; instead a cyan outline glow (`box-shadow` ring,
  0 0 12px `--accent` at low opacity) on hover/active/focus, evoking a highlighted trace on a
  schematic rather than a physical lit surface.
- **Motion:** UI transitions 180ms ease-out. Scroll-driven layer separation is **not**
  time-based at all — it's a pure function of scroll position (`computeProgress`), so there is
  no fixed duration for the main scrollytelling sequence; it's exactly as fast or slow as the
  user scrolls, and fully reversible.

## Layout intent

The **stage** (the button and, later, its exploded layers/box-model/compositing views) is the
hero. On desktop (1440×900) the stage is a pinned, centered viewport-height panel with
annotation callouts positioned beside/around it in the blueprint grid as the user scrolls
through the sequence — the diagram itself, not surrounding text, occupies the majority of the
screen at every scroll position. On phone (390×844) the layout stacks: the stage takes the
top ~60vh and pins there while annotation text scrolls beneath it, keeping the diagram as the
dominant visual the whole way through rather than shrinking it into a sidebar.

No dead space: the blueprint grid background (a faint repeating cyan grid, see `src/style.css`)
fills any area not occupied by the stage or copy, so there is never a seam of flat empty
background.

## Signature detail

The **grid-paper background** — a subtle 32px cyan grid over the navy base — plus the
**`// anatomy of a`** eyebrow line above the wordmark, styled like a code comment, are the
signature pairing: together they signal "this is a technical document about to get taken
apart" before the user scrolls a single pixel. As the scroll sequence progresses, the same grid
will be reused as the literal measurement backdrop behind the exploded box-model view, tying
the decorative background directly to the content.

## Notes

This project is an explainer, not a game or playful toy, so the juice/SFX plan (§D1.5) doesn't
apply — there's no win state or synthesized sound design here. The interaction budget instead
goes entirely into making the scroll-scrubbed transitions between pipeline stages feel precise
and physically direct, which is this project's equivalent of "game feel."

The **rest and recompose** bookend stages (progress 0 and 1) are the one deliberate exception to
"the diagram occupies the majority of the screen at every scroll position": the whole narrative
is "It's just a button [reveal] ...and then it's just a button again," so those two stages show
the literal, undramatic button rather than a blown-up cutaway — the contrast against the
dom/box/paint/composite stages is the point. Rest and recompose measure ~24vh by design.

The **composite stage's unpromoted (default) frame** is a second, narrower deliberate exception,
added at the same closeout that fixed the bug below: `scene.js` puts the document and button
layers at the *same* z depth when unpromoted, by design — "most elements share one layer" is
the point being taught, and a shared layer has no separation to blow up into a >=60vh cutaway
without either an unjustifiably large `--explode-boost` or a purely cosmetic label-only spread
that starts clipping off the top of the stage at desktop width (the same class of bug the fix
below closes, just on the label instead of the plane). It measures ~48-53vh unpromoted at
1440x900 — under the floor but fully on screen — and the payoff is one click away: promoted, the
same group measures ~93vh, comfortably clearing it. See `docs/BACKLOG.md` Epic 5 for the
measured trade-off space this exception is based on.

Measured in Chromium at 1440×900 (closeout, 2026-07-17): box 72.8vh and paint 81.9vh clear the
>=60vh floor. The dom stage's tree diagram is 34.3vh on its own but composes with the subject
button beneath it to fill roughly the upper two thirds, which reads correctly. Composite
regressed at that closeout — 34.2vh unpromoted, and toggling promote threw the button layer
entirely out of the stage (see `docs/BACKLOG.md` Epic 5, since fixed: `--explode-boost` capped
at a perspective-safe 1.3125, composite label offset given its own independent base so the
group still reads with weight, phone width given a further reduction to keep the label clear of
`.stage`'s `overflow: hidden`). Re-measured post-fix: promoted 93.1vh, unpromoted 48.7vh, neither
clipped, at 1440x900. An earlier note here claimed "dom/box/paint/composite measure 50-82vh";
that did not reproduce for composite either before or after this fix and remains corrected.

## Closeout verification

The final ship-gate pass on 2026-07-21 rendered and inspected the resting and composite frames
at 390×844, 768×900, and 1440×900 in Chromium. The stage fills each viewport, the blueprint
grid carries to every edge, no horizontal overflow appears, and the composite planes and labels
stay inside the viewport and clear of the fixed header with promotion off and on. The 768×900
check found and closed a shorter-tablet clipping gap that the earlier 768×1024 pass missed.

Keyboard focus is visible on the header links, subject button, composite toggle, CTA, and footer
link. The hidden composite toggle leaves the tab order until its stage is active, and every link
and button measures at least 44×44px. The Space Grotesk and IBM Plex Mono hierarchy, typographic
wordmark, cyan monogram favicon, sharp controls, grid atmosphere, and orange callouts remain one
consistent blueprint system from the interactive hero through the explainer and footer.
