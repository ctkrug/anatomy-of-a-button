import { expect, test } from "@playwright/test";

/**
 * Regression coverage for a closeout-blocking bug (docs/BACKLOG.md Epic 5):
 * --explode-boost: 3.0 sent the promoted button layer's translate3d z past
 * .scene's perspective, magnifying it ~2.6x and pushing it entirely below a
 * 900px viewport. jsdom (the Vitest suite's DOM) does not compute perspective
 * or 3D transforms at all, so this class of bug is only visible to a real
 * browser laying out real CSS — hence this separate e2e project.
 */

async function scrollToComposite(page) {
  const { sectionTop, sectionHeight } = await page.evaluate(() => {
    const el = document.querySelector(".sequence");
    const rect = el.getBoundingClientRect();
    return { sectionTop: rect.top + window.scrollY, sectionHeight: rect.height };
  });
  const viewportHeight = page.viewportSize().height;
  const span = sectionHeight - viewportHeight;
  // Mid-peak of the composite separation band (scene.js SEPARATION_BANDS.composite
  // is 0.72-0.96, peaking 0.82-0.88) — full separation, not a transition frame.
  await page.evaluate((y) => window.scrollTo(0, y), sectionTop + 0.85 * span);
  await expect(page.locator(".stage")).toHaveAttribute("data-stage", "composite");
}

async function compositeBoundingBox(page) {
  return page.evaluate(() => {
    const group = document.querySelector('[data-group="composite"]');
    const rects = [...group.querySelectorAll(".plane, .plane-label")].map((el) =>
      el.getBoundingClientRect(),
    );
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    return { top, bottom, left, right };
  });
}

function expectOnScreen(box, viewport) {
  expect(box.top).toBeGreaterThanOrEqual(-1);
  expect(box.left).toBeGreaterThanOrEqual(-1);
  expect(box.bottom).toBeLessThanOrEqual(viewport.height + 1);
  expect(box.right).toBeLessThanOrEqual(viewport.width + 1);
}

test("composite group stays fully on screen, unpromoted", async ({ page }) => {
  await page.goto("/");
  await scrollToComposite(page);
  const box = await compositeBoundingBox(page);
  expectOnScreen(box, page.viewportSize());
});

test("promoting the button layer separates it without clipping it off screen", async ({
  page,
}) => {
  await page.goto("/");
  await scrollToComposite(page);

  const before = await compositeBoundingBox(page);

  await page.click(".promote-toggle");
  await expect(page.locator(".promote-toggle")).toHaveAttribute("aria-pressed", "true");

  const after = await compositeBoundingBox(page);
  expectOnScreen(after, page.viewportSize());

  // The regression this guards against made the diagram emptier on click
  // (the promoted layer left the viewport entirely); promoting should instead
  // visibly separate the two layers into a taller group.
  const beforeHeight = before.bottom - before.top;
  const afterHeight = after.bottom - after.top;
  expect(afterHeight).toBeGreaterThan(beforeHeight);
});
