import { describe, expect, it, vi } from "vitest";

describe("main entry point", () => {
  it("mounts the sequence without throwing given the real page shape", async () => {
    vi.resetModules();
    document.body.innerHTML = `
      <section class="sequence" id="sequence" style="height: 3000px;">
        <div class="stage" id="stage">
          <div class="scene">
            <div class="deck" data-deck>
              <button class="subject-button" data-subject type="button">Click me</button>
            </div>
          </div>
          <div class="annotations" data-annotations></div>
          <button class="promote-toggle" data-promote-toggle type="button" aria-pressed="false">
            promote to its own GPU layer
          </button>
        </div>
      </section>
    `;

    await expect(import("../src/main.js")).resolves.toBeDefined();

    const deck = document.querySelector("[data-deck]");
    expect(deck.style.getPropertyValue("--deck-scale")).not.toBe("");

    const toggle = document.querySelector("[data-promote-toggle]");
    expect(toggle.tabIndex).toBe(-1);
  });

  it("flips aria-pressed on the promote toggle when clicked", async () => {
    vi.resetModules();
    document.body.innerHTML = `
      <section class="sequence" id="sequence" style="height: 3000px;">
        <div class="stage" id="stage">
          <div class="scene">
            <div class="deck" data-deck>
              <button class="subject-button" data-subject type="button">Click me</button>
            </div>
          </div>
          <div class="annotations" data-annotations></div>
          <button class="promote-toggle" data-promote-toggle type="button" aria-pressed="false">
            promote to its own GPU layer
          </button>
        </div>
      </section>
    `;

    await import("../src/main.js");

    const toggle = document.querySelector("[data-promote-toggle]");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    toggle.click();
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    toggle.click();
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });
});
