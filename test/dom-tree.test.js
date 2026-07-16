import { beforeEach, describe, expect, it } from "vitest";
import { createDomTree, TREE_EDGES, TREE_NODES } from "../src/render/dom-tree.js";

describe("tree data", () => {
  it("marks exactly one node as the subject button", () => {
    const subjects = TREE_NODES.filter((n) => n.subject);
    expect(subjects).toHaveLength(1);
    expect(subjects[0].text).toBe("<button>");
  });

  it("uses unique node ids", () => {
    expect(new Set(TREE_NODES.map((n) => n.id)).size).toBe(TREE_NODES.length);
  });

  it("gives the button a parent and siblings, per story 3.1", () => {
    const children = TREE_EDGES.filter(([parent]) => parent === "toolbar").map(([, c]) => c);
    expect(children).toContain("button");
    // The point of the diagram is that the button is one node among several.
    expect(children.filter((c) => c !== "button").length).toBeGreaterThanOrEqual(2);
  });

  it("references only known nodes in its edges", () => {
    const ids = new Set(TREE_NODES.map((n) => n.id));
    for (const [from, to] of TREE_EDGES) {
      expect(ids.has(from)).toBe(true);
      expect(ids.has(to)).toBe(true);
    }
  });

  it("connects every node except the root", () => {
    const linked = new Set(TREE_EDGES.flat());
    for (const node of TREE_NODES) {
      expect(linked.has(node.id)).toBe(true);
    }
  });

  it("lays children out below their parent", () => {
    const byId = Object.fromEntries(TREE_NODES.map((n) => [n.id, n]));
    for (const [from, to] of TREE_EDGES) {
      expect(byId[to].y).toBeGreaterThan(byId[from].y);
    }
  });

  it("centres the subject node horizontally in the viewBox", () => {
    const subject = TREE_NODES.find((n) => n.subject);
    // The drop line has to land on the real button at the deck's centre.
    expect(subject.x).toBe(240);
  });

  it("keeps every node inside the 480x220 viewBox", () => {
    for (const node of TREE_NODES) {
      expect(node.x - node.w / 2).toBeGreaterThanOrEqual(0);
      expect(node.x + node.w / 2).toBeLessThanOrEqual(480);
      expect(node.y - node.h / 2).toBeGreaterThanOrEqual(0);
      expect(node.y + node.h / 2).toBeLessThanOrEqual(220);
    }
  });

  it("does not overlap sibling nodes on the same row", () => {
    const rows = new Map();
    for (const node of TREE_NODES) {
      if (!rows.has(node.y)) rows.set(node.y, []);
      rows.get(node.y).push(node);
    }
    for (const row of rows.values()) {
      const sorted = [...row].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i += 1) {
        const gap = sorted[i].x - sorted[i].w / 2 - (sorted[i - 1].x + sorted[i - 1].w / 2);
        expect(gap).toBeGreaterThan(0);
      }
    }
  });
});

describe("createDomTree", () => {
  let svg;

  beforeEach(() => {
    svg = createDomTree();
  });

  it("returns a detached svg element", () => {
    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(svg.isConnected).toBe(false);
  });

  it("renders a box and a label for every node", () => {
    expect(svg.querySelectorAll(".dom-tree-node")).toHaveLength(TREE_NODES.length);
    const labels = [...svg.querySelectorAll(".dom-tree-node text")].map((t) => t.textContent);
    expect(labels).toEqual(TREE_NODES.map((n) => n.text));
  });

  it("renders a connector for every edge", () => {
    expect(svg.querySelectorAll(".dom-tree-edge")).toHaveLength(TREE_EDGES.length);
  });

  it("marks the subject node so it can be highlighted", () => {
    const subject = svg.querySelectorAll(".dom-tree-node.is-subject");
    expect(subject).toHaveLength(1);
    expect(subject[0].querySelector("text").textContent).toBe("<button>");
  });

  it("drops a connector line toward the real button below", () => {
    expect(svg.querySelector(".dom-tree-drop")).not.toBeNull();
  });

  it("is hidden from assistive tech — it duplicates the annotation copy", () => {
    expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  it("scales with its container rather than assuming a fixed pixel size", () => {
    expect(svg.getAttribute("viewBox")).toBe("0 0 480 220");
    expect(svg.hasAttribute("width")).toBe(false);
  });

  it("builds an independent element on each call", () => {
    expect(createDomTree()).not.toBe(svg);
  });
});
