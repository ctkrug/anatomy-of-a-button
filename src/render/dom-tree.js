/**
 * The DOM-tree plane: an SVG showing the subject button as a node with a
 * parent and siblings, with a connector dropping onto the real <button>
 * element that sits at the centre of the deck below it.
 */

const NS = "http://www.w3.org/2000/svg";

/** Node boxes, in viewBox units. `subject` marks the button itself. */
export const TREE_NODES = [
  { id: "body", text: "<body>", x: 240, y: 18, w: 88, h: 30 },
  { id: "toolbar", text: '<div class="toolbar">', x: 240, y: 84, w: 172, h: 30 },
  { id: "label", text: "<span>", x: 78, y: 150, w: 84, h: 30 },
  { id: "button", text: "<button>", x: 240, y: 150, w: 100, h: 30, subject: true },
  { id: "icon", text: "<svg>", x: 396, y: 150, w: 78, h: 30 },
];

/** Parent → child edges between the node boxes above. */
export const TREE_EDGES = [
  ["body", "toolbar"],
  ["toolbar", "label"],
  ["toolbar", "button"],
  ["toolbar", "icon"],
];

function el(name, attrs, parent) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  if (parent) parent.appendChild(node);
  return node;
}

function findNode(id) {
  const node = TREE_NODES.find((n) => n.id === id);
  if (!node) throw new Error(`unknown tree node: ${id}`);
  return node;
}

/**
 * Builds the tree SVG. Returns a detached element the caller mounts into the
 * deck; nothing here reads layout, so it is safe to build before mount.
 */
export function createDomTree() {
  const svg = el("svg", {
    class: "dom-tree",
    viewBox: "0 0 480 220",
    "aria-hidden": "true",
    focusable: "false",
    preserveAspectRatio: "xMidYMid meet",
  });

  const edges = el("g", { class: "dom-tree-edges" }, svg);
  for (const [fromId, toId] of TREE_EDGES) {
    const from = findNode(fromId);
    const to = findNode(toId);
    const midY = (from.y + from.h / 2 + (to.y - to.h / 2)) / 2;
    // Elbow connectors: down out of the parent, across, then down into the
    // child — the visual grammar of a tree view rather than a straight line.
    el(
      "path",
      {
        class: "dom-tree-edge",
        d: `M ${from.x} ${from.y + from.h / 2} V ${midY} H ${to.x} V ${to.y - to.h / 2}`,
      },
      edges,
    );
  }

  for (const node of TREE_NODES) {
    const group = el(
      "g",
      { class: `dom-tree-node${node.subject ? " is-subject" : ""}` },
      svg,
    );
    el(
      "rect",
      {
        x: node.x - node.w / 2,
        y: node.y - node.h / 2,
        width: node.w,
        height: node.h,
        rx: 2,
      },
      group,
    );
    const text = el("text", { x: node.x, y: node.y, "text-anchor": "middle" }, group);
    text.textContent = node.text;
  }

  // The drop line from the subject node onto the real button below.
  const subject = findNode("button");
  el(
    "path",
    {
      class: "dom-tree-drop",
      d: `M ${subject.x} ${subject.y + subject.h / 2} V 208`,
    },
    svg,
  );
  const callout = el("text", { class: "dom-tree-callout", x: subject.x + 66, y: 200 }, svg);
  callout.textContent = "this one";

  return svg;
}
