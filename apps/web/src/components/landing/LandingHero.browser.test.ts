import { expect, test, type Page } from "@playwright/test";

const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844 };

async function mountHero(
  page: Page,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport);
  await page.goto("/");
  await page.evaluate(() => {
    const root = document.querySelector("main.public-ui");
    if (!root) throw new Error("Public landing root was not rendered");
    root.innerHTML = `
      <section class="public-hero" data-testid="hero-section" aria-labelledby="hero-title">
        <div class="public-hero__copy">
          <h1 id="hero-title" data-testid="hero-title">Misión 1-99</h1>
          <p data-testid="hero-subtitle">Transformamos vidas</p>
        </div>
        <div class="public-hero__visual" data-testid="hero-visual">
          <img src="/assets/brand/logo-horizontal.png" alt="Misión 1-99" class="public-hero__image" data-testid="hero-image" />
          <div class="public-hero__accent" aria-hidden="true" data-testid="hero-accent"></div>
          <img src="/assets/brand/isotipo-white.png" alt="" aria-hidden="true" class="public-hero__isotipo" data-testid="hero-isotipo" />
        </div>
      </section>`;
  });
  await expect(page.getByTestId("hero-isotipo")).toBeVisible();
}

async function visualEvidence(page: Page) {
  return page.getByTestId("hero-visual").evaluate((visual) => {
    const copy = document.querySelector<HTMLElement>(".public-hero__copy");
    const image = document.querySelector<HTMLElement>(".public-hero__image");
    const accent = document.querySelector<HTMLElement>(".public-hero__accent");
    const isotipo = document.querySelector<HTMLElement>(
      ".public-hero__isotipo",
    );
    if (!copy || !image || !accent || !isotipo)
      throw new Error("Hero layers are incomplete");
    const visualBox = visual.getBoundingClientRect();
    const copyBox = copy.getBoundingClientRect();
    return {
      visual: {
        left: visualBox.left,
        width: visualBox.width,
        height: visualBox.height,
        top: visualBox.top,
      },
      copy: { right: copyBox.right, bottom: copyBox.bottom },
      overflow: getComputedStyle(visual).overflow,
      objectFit: getComputedStyle(image).objectFit,
      accentWidth: accent.getBoundingClientRect().width,
      zIndexes: [image, accent, isotipo].map(
        (element) => getComputedStyle(element).zIndex,
      ),
    };
  });
}

test("renders the desktop hero as a clipped two-column three-layer composition", async ({
  page,
}) => {
  await mountHero(page, desktop);
  const evidence = await visualEvidence(page);

  expect(evidence.visual).toMatchObject({ width: 440, height: 520 });
  expect(evidence.copy.right).toBeLessThanOrEqual(evidence.visual.left);
  expect(evidence.accentWidth).toBe(148);
  expect(evidence.overflow).toBe("hidden");
  expect(evidence.objectFit).toBe("cover");
  expect(evidence.zIndexes).toEqual(["1", "2", "3"]);
  expect(
    (await page.getByTestId("hero-section").screenshot()).byteLength,
  ).toBeGreaterThan(0);
});

test("renders the compact hero stacked with all three layers visible", async ({
  page,
}) => {
  await mountHero(page, mobile);
  const evidence = await visualEvidence(page);

  expect(evidence.visual).toMatchObject({ width: 342, height: 252 });
  expect(evidence.copy.bottom).toBeLessThanOrEqual(evidence.visual.top);
  expect(evidence.accentWidth).toBe(92);
  expect(evidence.overflow).toBe("hidden");
  expect(evidence.objectFit).toBe("cover");
  expect(evidence.zIndexes).toEqual(["1", "2", "3"]);
  expect(
    (await page.getByTestId("hero-section").screenshot()).byteLength,
  ).toBeGreaterThan(0);
});
