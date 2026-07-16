/**
 * The pipeline stages the scroll sequence scrubs through, and the annotation
 * copy for each. Ranges are in global sequence progress (0..1) and must be
 * contiguous and cover the whole range — the scene interpolates across the
 * boundaries, so a gap would read as a dead zone and an overlap as a pop.
 */

export const STAGES = [
  {
    id: "rest",
    label: "00 · at rest",
    range: [0, 0.1],
    title: "It's just a button.",
    body: "One element. Thirty characters of HTML. You have written this line a thousand times and never once wondered what it cost. Keep scrolling.",
  },
  {
    id: "dom",
    label: "01 · structure",
    range: [0.1, 0.28],
    title: "First, it's a node.",
    body: "Before anything is drawn, the parser turns your markup into a tree. The button isn't a picture of a button yet — it's an object with a parent, siblings, and a position in the document. Every style rule that follows is matched against this structure, which is why a selector like .toolbar > button can find it at all.",
  },
  {
    id: "box",
    label: "02 · layout",
    range: [0.28, 0.5],
    title: "Then, it's a box.",
    body: "Layout resolves the node into four nested rectangles: the content, the padding around it, the border around that, and the margin holding everything else away. The grey rectangle you see is only the border box — the space the button actually claims on the page is bigger, and it is this arithmetic, not the paint, that decides where every other element on the page lands.",
  },
  {
    id: "paint",
    label: "03 · paint",
    range: [0.5, 0.7],
    title: "Then, it's a stack of drawings.",
    body: "Painting doesn't produce a button. It produces an ordered list of drawing operations — shadow, then background, then border, then text — each filling the same rectangle, each drawn on top of the last. The order is fixed by the spec, and it's the reason a background can never cover its own text.",
  },
  {
    id: "composite",
    label: "04 · composite",
    range: [0.7, 0.88],
    title: "Then, it's a texture on the GPU.",
    body: "Those drawings get rasterised into layers and handed to the compositor. Most elements share one layer. Give an element a transform, an opacity animation, or will-change, and the browser may promote it to a layer of its own — which it can then move on the GPU without repainting anything.",
  },
  {
    id: "recompose",
    label: "05 · recompose",
    range: [0.88, 1],
    title: "And then it's just a button again.",
    body: "Tree, boxes, paint order, layers, composite — all of it, every frame, for one grey rectangle that says Click me. It should look a little less boring now.",
  },
];

/** Look up a stage definition by id. Returns undefined for an unknown id. */
export function getStage(id) {
  return STAGES.find((stage) => stage.id === id);
}

/**
 * The stage whose range contains this progress. Ranges are half-open
 * [start, end) so a boundary belongs to exactly one stage; progress 1 resolves
 * to the last stage rather than falling off the end.
 */
export function stageAt(progress) {
  const p = Math.min(1, Math.max(0, progress));
  return (
    STAGES.find((stage) => p >= stage.range[0] && p < stage.range[1]) ?? STAGES[STAGES.length - 1]
  );
}
