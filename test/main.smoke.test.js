import { describe, expect, it } from "vitest";

describe("main entry point", () => {
  it("mounts without throwing given the expected DOM shape", async () => {
    document.body.innerHTML = `<div class="stage" id="stage" style="height: 100px;"></div>`;

    await expect(import("../src/main.js")).resolves.toBeDefined();

    const stage = document.getElementById("stage");
    expect(stage.style.getPropertyValue("--progress")).not.toBe("");
  });
});
