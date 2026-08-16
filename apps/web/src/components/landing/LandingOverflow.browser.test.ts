import { expect, test } from "@playwright/test";

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`keeps the ${viewport.name} landing within the viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => {
      const root = document.querySelector("main.public-ui");
      if (!root) throw new Error("Public landing root was not rendered");
      root.innerHTML = `
        <div style="min-height: 120vh"></div>
        <footer class="landing-footer">Misión 1-99</footer>`;
    });

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  });
}
