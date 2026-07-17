/**
 * The layer planes: one absolutely-positioned element per box-model box,
 * paint operation, and compositor layer, stacked in the deck's 3D space.
 *
 * These are built once at mount; per-frame the renderer only writes CSS
 * custom properties on them, so scrolling never touches the DOM structure.
 */

/**
 * Per-layer contents. Each paint plane draws only its own contribution, so
 * the stack really does composite back into the button rather than being four
 * copies of it — which leaves the text layer as the only one with anything to
 * write. Every other paint layer is drawn purely by its CSS face.
 */
const PAINT_CONTENT = {
  text: "Click me",
};

function labelFor(layer) {
  const label = document.createElement("span");
  label.className = "plane-label";
  const name = document.createElement("span");
  name.className = "plane-label-name";
  name.textContent = layer.label;
  label.appendChild(name);
  if (layer.note) {
    const note = document.createElement("span");
    note.className = "plane-label-note";
    note.textContent = layer.note;
    label.appendChild(note);
  }
  return label;
}

/**
 * Builds one plane element for a layer.
 * @param {object} layer a layer from the scene model.
 * @param {string} kind "box" | "paint" | "composite".
 */
export function createPlane(layer, kind) {
  const plane = document.createElement("div");
  plane.className = `plane plane-${kind}`;
  plane.dataset.layer = layer.id;
  plane.dataset.kind = kind;

  if (typeof layer.expandX === "number") {
    plane.style.setProperty("--expand-x", `${layer.expandX}px`);
    plane.style.setProperty("--expand-y", `${layer.expandY}px`);
  }

  const face = document.createElement("div");
  face.className = "plane-face";
  if (kind === "paint") {
    face.textContent = PAINT_CONTENT[layer.id] ?? "";
  }
  plane.appendChild(face);
  plane.appendChild(labelFor(layer));
  return plane;
}

/**
 * Builds a group element holding one plane per layer.
 * @returns {{group: HTMLElement, planes: Map<string, HTMLElement>}}
 */
export function createPlaneGroup(name, kind, layers) {
  const group = document.createElement("div");
  group.className = `plane-group plane-group-${kind}`;
  group.dataset.group = name;
  group.setAttribute("aria-hidden", "true");

  const planes = new Map();
  for (const layer of layers) {
    const plane = createPlane(layer, kind);
    planes.set(layer.id, plane);
    group.appendChild(plane);
  }
  return { group, planes };
}
