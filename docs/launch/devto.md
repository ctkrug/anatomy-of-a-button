---
title: I took one HTML button apart to see what the browser actually does with it
published: false
tags: webdev, css, javascript, performance
---

"It's just a button" is doing a lot of hiding.

I've written `<button>` maybe ten thousand times. I could recite the render pipeline at you:
parse, layout, paint, composite. But I realised I had never actually *seen* it. I knew the box
model as an interview answer, not as four rectangles I'd watched pull apart. So I built
[Cutaway](https://apps.charliekrug.com/anatomy-of-a-button/): you scroll, and one real button
comes apart into every stage the browser puts it through, then reassembles.

Two decisions turned out to be more interesting than I expected.

## The whole sequence is a pure function of scroll position

The obvious way to build scrollytelling is to fire animations when a section enters the
viewport. I didn't want that. Timed animations and scroll fight each other: scroll up halfway
through a 400ms tween and you get a stutter, or a section that's half-exploded because the
timeline is mid-flight.

So there are no timers and no transitions on anything scroll-driven. There's one function:

```js
const scene = computeScene(progress); // progress is 0..1
```

It maps a scroll offset to every value the diagram needs (deck rotation, per-layer z depth,
group opacities, which annotation is showing) and it touches no DOM at all. The renderer takes
that object and writes CSS custom properties. That's the entire architecture.

The payoff is that the sequence is exactly as fast as your thumb, perfectly reversible, and
unit-testable without a browser. I can assert that progress 0 and progress 1 produce identical
resting frames, which is the property I'd never have gotten right by hand.

That last one had a genuinely fun bug. The identity test compared frames with `Object.is` and
kept failing on rotation, because the tilt is a negative constant multiplied by an envelope
that returns to zero, and `-24 * 0 === -0`. It *looks* identical. `Object.is(-0, 0)` is
`false`. Every separation now normalises `-0` back to `0` at the source.

## Separation is built from envelopes, not keyframes

Every layer's movement is a 0 to n to 0 hump across a scroll band:

```js
const SEPARATION_BANDS = {
  boxModel:  { start: 0.28, peakStart: 0.44, peakEnd: 0.48, end: 0.56 },
  paint:     { start: 0.5,  peakStart: 0.64, peakEnd: 0.68, end: 0.78 },
  composite: { start: 0.72, peakStart: 0.82, peakEnd: 0.88, end: 0.96 },
};
```

Because every envelope returns to zero by the end of its band, the button reassembles for
free. There is no "reset" step and no cleanup code, which is where I'd have expected the bugs
to live. The stages overlap slightly on purpose so one group is fading in while the last is
still settling, instead of everything hitting zero at a hard boundary and popping.

## What I'd do differently

I'd have measured the thing in a real browser far earlier.

The diagram is sized against a reference button and scales up from there. For a long time it
was hard-coded at 176x60px, which looked fine while I was building the scene model and was
absurd once I actually looked at the page: the hero diagram occupied about 5% of the screen on
a desktop viewport. A scrollytelling piece whose entire pitch is "watch this come apart" was
rendering the thing coming apart at the size of a postage stamp.

My unit tests were all green the whole time, and they were never going to catch it. They test
the scene model, which is a pure function producing numbers, and the numbers were right. The
bug was in the CSS that turns those numbers into pixels. I ended up driving a real Chromium
and measuring the actual bounding boxes, which found three more layout bugs the size increase
had exposed and I'd never have seen from unit tests or a quick glance.

Test the pure logic in isolation, absolutely. But if the output is *visual*, at some point you
have to open the browser and measure the pixels. "The tests pass" and "it looks right" are
different claims, and I'd been treating them as the same one.

The code is MIT and reasonably small:
[github.com/ctkrug/anatomy-of-a-button](https://github.com/ctkrug/anatomy-of-a-button)
