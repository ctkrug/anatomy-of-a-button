import "./style.css";
import { attachScrollProgress } from "./scroll/progress.js";

const stage = document.getElementById("stage");

// Placeholder wiring for the "hello it runs" scaffold: future runs will use
// this progress value to drive the box-model/paint/compositing breakdown.
attachScrollProgress(stage, (progress) => {
  stage.style.setProperty("--progress", progress.toFixed(3));
});
