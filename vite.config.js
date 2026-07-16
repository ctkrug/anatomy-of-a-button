import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works when served from a subpath
  // (e.g. apps.charliekrug.com/anatomy-of-a-button), not just at a domain root.
  base: "./",
  build: {
    outDir: "dist",
  },
  test: {
    environment: "jsdom",
  },
});
