import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "../src/render/renderer.js";
import { computeScene } from "../src/scene/scene.js";
import { STAGES } from "../src/scene/stages.js";

function stageMarkup() {
  const root = document.createElement("div");
  root.innerHTML = `
    <div class="scene">
      <div class="deck" data-deck>
        <button class="subject-button" data-subject type="button">Click me</button>
      </div>
    </div>
    <div class="annotations" data-annotations></div>
  `;
  document.body.appendChild(root);
  return root;
}

describe("mount", () => {
  let root;

  beforeEach(() => {
    document.body.innerHTML = "";
    root = stageMarkup();
  });

  it("returns a render function", () => {
    expect(typeof mount(root).render).toBe("function");
  });

  it("builds a plane group for each pipeline stage that has one", () => {
    mount(root);
    for (const group of ["domTree", "boxModel", "paint", "composite"]) {
      expect(root.querySelector(`[data-group="${group}"]`)).not.toBeNull();
    }
  });

  it("builds one labelled plane per box-model box", () => {
    mount(root);
    const labels = [...root.querySelectorAll('[data-group="boxModel"] .plane-label-name')].map(
      (n) => n.textContent,
    );
    expect(labels).toEqual(["margin", "border", "padding", "content"]);
  });

  it("builds one labelled plane per paint operation, in paint order (story 2.1)", () => {
    mount(root);
    const labels = [...root.querySelectorAll('[data-group="paint"] .plane-label-name')].map(
      (n) => n.textContent,
    );
    expect(labels).toEqual(["box-shadow", "background", "border", "text"]);
  });

  it("builds one annotation per stage with its real copy", () => {
    mount(root);
    const figures = root.querySelectorAll(".annotation");
    expect(figures).toHaveLength(STAGES.length);
    expect(figures[0].querySelector(".annotation-title").textContent).toBe(STAGES[0].title);
    expect(figures[0].querySelector(".annotation-body").textContent).toBe(STAGES[0].body);
  });

  it("keeps the subject button as the last child so it renders on top at rest", () => {
    mount(root);
    const deck = root.querySelector("[data-deck]");
    expect(deck.lastElementChild.dataset.subject).toBeDefined();
  });

  it("does not duplicate the button's text for assistive tech", () => {
    mount(root);
    for (const group of root.querySelectorAll(".plane-group")) {
      expect(group.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("throws a named error when the stage element is missing", () => {
    expect(() => mount(null)).toThrow(/needs a stage element/);
  });

  it("throws a named error when required structure is missing", () => {
    const empty = document.createElement("div");
    expect(() => mount(empty)).toThrow(/data-deck/);
  });
});

describe("render", () => {
  let root;
  let render;

  beforeEach(() => {
    document.body.innerHTML = "";
    root = stageMarkup();
    render = mount(root).render;
  });

  const deck = () => root.querySelector("[data-deck]");
  const subject = () => root.querySelector("[data-subject]");
  const group = (name) => root.querySelector(`[data-group="${name}"]`);

  it("shows the plain button and hides every group at rest", () => {
    render(computeScene(0));
    // jsdom canonicalises a real CSS property's serialized value, so a
    // "1.000" write reads back as "1" (unlike the custom properties below,
    // which are stored verbatim).
    expect(subject().style.opacity).toBe("1");
    expect(subject().style.visibility).toBe("");
    for (const name of ["domTree", "boxModel", "paint", "composite"]) {
      expect(group(name).style.display).toBe("none");
    }
  });

  it("leaves the deck untilted at rest", () => {
    render(computeScene(0));
    expect(deck().style.getPropertyValue("--rotate-x")).toBe("0.00deg");
    expect(deck().style.getPropertyValue("--deck-scale")).toBe("1.0000");
  });

  it("produces the identical button/deck DOM state at progress 0 and progress 1 (story 2.3)", () => {
    // Scoped to the deck: the annotation copy legitimately differs between
    // progress 0 ("It's just a button") and progress 1 ("...just a button
    // again") by design, so comparing the whole root would be the wrong test.
    render(computeScene(0));
    const atStart = deck().outerHTML;
    render(computeScene(0.5));
    render(computeScene(1));
    expect(deck().outerHTML).toBe(atStart);
  });

  it("tilts the deck and reveals the box model mid-sequence", () => {
    render(computeScene(0.44));
    expect(parseFloat(deck().style.getPropertyValue("--rotate-x"))).toBeLessThan(-20);
    expect(group("boxModel").style.display).not.toBe("none");
    expect(parseFloat(group("boxModel").style.opacity)).toBeGreaterThan(0.9);
  });

  it("separates the planes in z as the scroll progresses", () => {
    const zAt = (p) => {
      render(computeScene(p));
      return parseFloat(
        root.querySelector('[data-layer="content"]').style.getPropertyValue("--z"),
      );
    };
    expect(zAt(0.3)).toBeLessThan(zAt(0.36));
    expect(zAt(0.36)).toBeLessThan(zAt(0.44));
  });

  it("takes the faded-out button out of the tab order mid-sequence", () => {
    render(computeScene(0.6));
    expect(subject().style.visibility).toBe("hidden");
    render(computeScene(1));
    expect(subject().style.visibility).toBe("");
  });

  it("exposes the current stage and promotion state on the root", () => {
    render(computeScene(0.2));
    expect(root.dataset.stage).toBe("dom");
    expect(root.dataset.promoted).toBe("false");
    render(computeScene(0.8, { promoted: true }));
    expect(root.dataset.stage).toBe("composite");
    expect(root.dataset.promoted).toBe("true");
  });

  it("exposes composite visibility for responsive layout corrections", () => {
    render(computeScene(0.72));
    expect(root.style.getPropertyValue("--composite-visibility")).toBe("0.000");

    render(computeScene(0.85));
    expect(root.style.getPropertyValue("--composite-visibility")).toBe("1.000");
  });

  it("moves the promoted button layer forward only when promoted (story 2.2)", () => {
    const buttonZ = () =>
      parseFloat(
        root
          .querySelector('[data-group="composite"] [data-layer="button"]')
          .style.getPropertyValue("--z"),
      );
    render(computeScene(0.85, { promoted: false }));
    const unpromoted = buttonZ();
    render(computeScene(0.85, { promoted: true }));
    expect(buttonZ()).toBeGreaterThan(unpromoted);
  });

  it("shows the current stage's annotation and hides distant ones", () => {
    render(computeScene(0.2));
    const visible = [...root.querySelectorAll(".annotation")].filter(
      (a) => a.style.display !== "none",
    );
    expect(visible.map((a) => a.dataset.stage)).toContain("dom");
    expect(visible.map((a) => a.dataset.stage)).not.toContain("composite");
  });

  it("ignores a missing scene instead of throwing", () => {
    expect(() => render(null)).not.toThrow();
    expect(() => render(undefined)).not.toThrow();
  });

  it("survives being driven across the full range in both directions", () => {
    expect(() => {
      for (let p = 0; p <= 1; p += 0.01) render(computeScene(p));
      for (let p = 1; p >= 0; p -= 0.01) render(computeScene(p));
    }).not.toThrow();
    expect(subject().style.opacity).toBe("1");
  });
});
