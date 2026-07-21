import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works when served from a subpath
  // (e.g. apps.charliekrug.com/anatomy-of-a-button), not just at a domain root.
  base: "./",
  build: {
    outDir: "site",
  },
  test: {
    environment: "jsdom",
    // test/e2e runs under Playwright's own runner (`npm run test:e2e`), not
    // Vitest — it drives a real browser to check CSS 3D-transform geometry
    // that jsdom doesn't lay out at all.
    exclude: ["node_modules/**", "test/e2e/**"],
  },
});
