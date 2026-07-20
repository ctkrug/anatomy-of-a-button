/**
 * Binds the scene model to the DOM.
 *
 * mount() builds the structure once; render(scene) writes only custom
 * properties and text, so a scroll frame does no DOM construction and no
 * layout reads. Everything it draws comes from computeScene — the renderer
 * holds no animation state of its own.
 */

import { BOX_LAYERS, COMPOSITE_LAYERS, PAINT_LAYERS } from "../scene/scene.js";
import { STAGES } from "../scene/stages.js";
import { createDomTree } from "./dom-tree.js";
import { createPlaneGroup } from "./planes.js";

/** Opacity below which a group is fully removed from the compositor. */
const HIDE_THRESHOLD = 0.001;

function requireElement(root, selector) {
  const found = root.querySelector(selector);
  if (!found) {
    throw new Error(`Cutaway: required element "${selector}" is missing`);
  }
  return found;
}

function createAnnotations(container) {
  const nodes = new Map();
  for (const stage of STAGES) {
    const figure = document.createElement("figure");
    figure.className = "annotation";
    figure.dataset.stage = stage.id;

    const label = document.createElement("p");
    label.className = "annotation-label";
    label.textContent = stage.label;

    const title = document.createElement("h2");
    title.className = "annotation-title";
    title.textContent = stage.title;

    const body = document.createElement("figcaption");
    body.className = "annotation-body";
    body.textContent = stage.body;

    figure.append(label, title, body);
    container.appendChild(figure);
    nodes.set(stage.id, figure);
  }
  return nodes;
}

/**
 * Mounts the sequence into a stage element.
 * @param {HTMLElement} root the stage element (must contain #deck and
 *   #annotations).
 * @returns {{render: (scene: object) => void}}
 */
export function mount(root) {
  if (!root) throw new Error("Cutaway: mount() needs a stage element");

  const deck = requireElement(root, "[data-deck]");
  const annotationHost = requireElement(root, "[data-annotations]");
  const subject = requireElement(root, "[data-subject]");

  const tree = createDomTree();
  const treeGroup = document.createElement("div");
  treeGroup.className = "plane-group plane-group-tree";
  treeGroup.dataset.group = "domTree";
  treeGroup.setAttribute("aria-hidden", "true");
  treeGroup.appendChild(tree);

  const box = createPlaneGroup("boxModel", "box", BOX_LAYERS);
  const paint = createPlaneGroup("paint", "paint", PAINT_LAYERS);
  const composite = createPlaneGroup("composite", "composite", COMPOSITE_LAYERS);

  // Insert before the subject button so the button stays the topmost thing in
  // the deck at rest, exactly as it renders with no sequence at all.
  deck.insertBefore(treeGroup, subject);
  deck.insertBefore(box.group, subject);
  deck.insertBefore(paint.group, subject);
  deck.insertBefore(composite.group, subject);

  const annotations = createAnnotations(annotationHost);
  const groups = {
    domTree: treeGroup,
    boxModel: box.group,
    paint: paint.group,
    composite: composite.group,
  };
  const planesByGroup = {
    boxModel: box.planes,
    paint: paint.planes,
    composite: composite.planes,
  };

  function applyGroup(name, opacity) {
    const element = groups[name];
    element.style.opacity = opacity.toFixed(3);
    // display:none rather than opacity 0 alone: a fully transparent group
    // still costs the compositor a layer on every scroll frame.
    element.style.display = opacity < HIDE_THRESHOLD ? "none" : "";
  }

  function applyLayers(name, layers) {
    const planes = planesByGroup[name];
    for (const layer of layers) {
      const plane = planes.get(layer.id);
      if (plane) plane.style.setProperty("--z", `${layer.z.toFixed(2)}px`);
    }
  }

  function render(scene) {
    if (!scene) return;

    deck.style.setProperty("--rotate-x", `${scene.deck.rotateX.toFixed(2)}deg`);
    deck.style.setProperty("--rotate-z", `${scene.deck.rotateZ.toFixed(2)}deg`);
    deck.style.setProperty("--deck-scale", scene.deck.scale.toFixed(4));

    subject.style.opacity = scene.groups.button.toFixed(3);
    // The resting button is a real, focusable control. Once it has faded out
    // it must leave the tab order too, or the reader tabs into an invisible
    // button mid-sequence.
    subject.style.visibility = scene.groups.button < HIDE_THRESHOLD ? "hidden" : "";

    applyGroup("domTree", scene.groups.domTree);
    applyGroup("boxModel", scene.groups.boxModel);
    applyGroup("paint", scene.groups.paint);
    applyGroup("composite", scene.groups.composite);
    // The phone layout reserves room for the whole time a composite plane is
    // painted. It switches only at the group's display threshold, while the
    // group is imperceptible, so the fading label can never drift into the
    // fixed header near either edge of its visibility band.
    root.style.setProperty(
      "--composite-visibility",
      (scene.groups.composite < HIDE_THRESHOLD ? 0 : 1).toFixed(3),
    );

    applyLayers("boxModel", scene.boxLayers);
    applyLayers("paint", scene.paintLayers);
    applyLayers("composite", scene.compositeLayers);

    for (const annotation of scene.annotations) {
      const node = annotations.get(annotation.id);
      if (!node) continue;
      node.style.opacity = annotation.opacity.toFixed(3);
      node.style.display = annotation.opacity < HIDE_THRESHOLD ? "none" : "";
    }

    root.dataset.stage = scene.stageId;
    root.dataset.promoted = String(scene.promoted);
  }

  return { render };
}
