import { expect, test } from "@playwright/test";

test("responsive shell keeps the stage composed and controls reachable", async ({ page }) => {
  await page.goto("/");

  const metrics = await page.evaluate(() => {
    const stage = document.querySelector(".stage").getBoundingClientRect();
    const controls = [...document.querySelectorAll("a, button")].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        label: element.textContent.trim(),
        width: rect.width,
        height: rect.height,
      };
    });

    return {
      viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      stage: { width: stage.width, height: stage.height },
      controls,
      hasFavicon: Boolean(document.querySelector('link[rel="icon"]')),
      toggleTabIndex: document.querySelector("[data-promote-toggle]").tabIndex,
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport.width);
  expect(metrics.stage.width).toBe(metrics.viewport.width);
  expect(metrics.stage.height).toBe(metrics.viewport.height);
  expect(metrics.hasFavicon).toBe(true);
  expect(metrics.toggleTabIndex).toBe(-1);

  for (const control of metrics.controls) {
    expect(control.width, `${control.label} target width`).toBeGreaterThanOrEqual(44);
    expect(control.height, `${control.label} target height`).toBeGreaterThanOrEqual(44);
  }

  await page.locator(".source-link").focus();
  await expect(page.locator(".source-link")).toBeFocused();
  expect(
    await page.locator(".source-link").evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe("solid");
});
