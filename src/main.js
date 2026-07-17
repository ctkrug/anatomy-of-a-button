import "./style.css";
import { attachPinProgress } from "./scroll/progress.js";
import { computeScene } from "./scene/scene.js";
import { mount } from "./render/renderer.js";

const sequence = document.getElementById("sequence");
const stage = document.getElementById("stage");
const promoteToggle = document.querySelector("[data-promote-toggle]");

const { render } = mount(stage);

let progress = 0;
let promoted = false;

function draw() {
  render(computeScene(progress, { promoted }));
}

attachPinProgress(sequence, (value) => {
  progress = value;
  draw();
});

promoteToggle?.addEventListener("click", () => {
  promoted = !promoted;
  promoteToggle.setAttribute("aria-pressed", String(promoted));
  draw();
});
