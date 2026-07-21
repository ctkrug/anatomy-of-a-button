import { defineConfig } from "@playwright/test";

/**
 * Real-browser checks for geometry that CSS 3D transforms produce (Vitest
 * runs on jsdom, which does not lay out perspective/translate3d at all — the
 * composite-stage overflow this suite guards against was invisible to the
 * unit suite for exactly that reason and only surfaced in manual real-browser
 * testing at closeout).
 */
export default defineConfig({
  testDir: "./test/e2e",
  webServer: {
    // Rebuild first: `vite preview` serves the existing site/ output, so a
    // stale build would silently test yesterday's CSS.
    command: "npm run build && npm run preview -- --port 4310 --strictPort",
    url: "http://localhost:4310",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:4310",
  },
  projects: [
    { name: "desktop-chromium", use: { viewport: { width: 1440, height: 900 } } },
    { name: "tablet-chromium", use: { viewport: { width: 768, height: 900 } } },
    { name: "phone-chromium", use: { viewport: { width: 390, height: 844 } } },
  ],
});
