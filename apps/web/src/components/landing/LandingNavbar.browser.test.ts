import { expect, test, type Page } from "@playwright/test";

const mobile = { width: 390, height: 844 };
const desktop = { width: 1440, height: 900 };
const labels = ["Inicio", "Misiones", "Nosotros", "Contacto"];

async function visit(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto("/");
  await expect(page.getByTestId("landing-navbar")).toBeVisible();
}

async function mountHeroFixture(page: Page) {
  await page.evaluate(() => {
    const root = document.querySelector("main.public-ui");
    const navbar = root?.querySelector(".landing-navbar");
    if (!root || !navbar)
      throw new Error("Public landing root was not rendered");

    const hero = document.createElement("section");
    hero.className = "public-hero";
    hero.innerHTML = `
      <div class="public-hero__grid">
        <div class="public-hero__copy">
          <h1>Presentación</h1>
        </div>
        <div class="public-hero__visual"></div>
      </div>`;
    root.replaceChildren(navbar, hero);
  });
}

test("enhances the compact mobile menu with accessible state transitions", async ({
  page,
}) => {
  await visit(page, mobile);
  const header = page.getByTestId("landing-navbar");
  const trigger = page.getByTestId("landing-navbar-menu-toggle");
  await mountHeroFixture(page);
  expect(await header.boundingBox()).toMatchObject({
    x: 0,
    y: 0,
    width: 390,
    height: 76,
  });
  const logo = page.getByTestId("landing-navbar-logo-image");
  await expect(logo).toBeVisible();
  expect(await logo.boundingBox()).toMatchObject({
    x: 24,
    y: 15.25,
    width: 176,
    height: 45,
  });
  await expect(logo).toHaveJSProperty("complete", true);
  const logoStyle = await logo.evaluate((element) => {
    const image = element as HTMLImageElement;
    const style = getComputedStyle(image);
    return {
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      objectFit: style.objectFit,
      objectPosition: style.objectPosition,
      width: style.width,
      height: style.height,
      visibility: style.visibility,
      opacity: style.opacity,
    };
  });
  expect(logoStyle).toEqual({
    naturalWidth: 1536,
    naturalHeight: 1024,
    objectFit: "cover",
    objectPosition: "50% 43%",
    width: "176px",
    height: "45px",
    visibility: "visible",
    opacity: "1",
  });
  expect((await logo.screenshot()).byteLength).toBeGreaterThan(0);

  const closedHero = await page.locator(".public-hero").evaluate((hero) => {
    const copy = hero.querySelector("h1");
    if (!(copy instanceof HTMLElement))
      throw new Error("Hero fixture is incomplete");
    const heroTop = hero.getBoundingClientRect().top;
    return {
      paddingTop: getComputedStyle(hero).paddingBlockStart,
      copyOffset: copy.getBoundingClientRect().top - heroTop,
    };
  });
  expect(closedHero).toEqual({ paddingTop: "124px", copyOffset: 124 });

  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toHaveAttribute("aria-label", "Abrir menú");
  await trigger.click();
  await expect(header).toHaveClass(/landing-navbar--open/);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(trigger).toHaveAttribute("aria-label", "Cerrar menú");
  await page.waitForTimeout(250);
  const openMenu = await page
    .getByTestId("landing-navbar-menu")
    .evaluate((menu) => {
      const navbar = menu.closest(".landing-navbar");
      if (!(navbar instanceof HTMLElement))
        throw new Error("Navbar is missing");
      const menuBox = menu.getBoundingClientRect();
      const navbarBox = navbar.getBoundingClientRect();
      return {
        menuBackground: getComputedStyle(menu).backgroundColor,
        navbarBackground: getComputedStyle(navbar).backgroundColor,
        menuBottom: menuBox.bottom,
        navbarBottom: navbarBox.bottom,
      };
    });
  expect(openMenu.menuBackground).toBe("rgb(23, 21, 21)");
  expect(openMenu.navbarBackground).toBe("rgb(23, 21, 21)");
  expect(openMenu.menuBottom).toBeLessThanOrEqual(openMenu.navbarBottom);
  expect((await header.screenshot()).byteLength).toBeGreaterThan(0);

  await page.locator("body").dispatchEvent("click");
  await expect(header).toHaveClass(/landing-navbar--open/);

  await page.keyboard.press("Escape");
  await expect(header).not.toHaveClass(/landing-navbar--open/);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test("closes the compact mobile menu after activating a link", async ({
  page,
}) => {
  await visit(page, mobile);
  const header = page.getByTestId("landing-navbar");
  await page.getByTestId("landing-navbar-menu-toggle").click();
  await page.getByRole("link", { name: "Contacto", exact: true }).click();
  await expect(header).not.toHaveClass(/landing-navbar--open/);
  await expect(page.getByTestId("landing-navbar-menu-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("keeps the desktop navigation visible and the mobile trigger unavailable", async ({
  page,
}) => {
  await visit(page, desktop);
  expect(await page.getByTestId("landing-navbar").boundingBox()).toMatchObject({
    x: 0,
    y: 0,
    width: 1440,
    height: 92,
  });
  const nav = page.getByTestId("landing-navbar-menu");
  const trigger = page.getByTestId("landing-navbar-menu-toggle");
  await expect(trigger).toBeHidden();
  for (const label of labels) {
    const link = nav.getByRole("link", { name: label, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toBeEnabled();
  }
  const logo = page.getByTestId("landing-navbar-logo-image");
  await expect(logo).toHaveAttribute(
    "src",
    "/assets/brand/logo-horizontal.png",
  );
  expect((await logo.boundingBox())?.width).toBe(244);
  expect((await logo.boundingBox())?.height).toBe(62);
});

test("centers desktop hero copy while seating the visual on the hero edge", async ({
  page,
}) => {
  await visit(page, desktop);
  await mountHeroFixture(page);

  const geometry = await page.locator(".public-hero").evaluate((hero) => {
    const copy = hero.querySelector<HTMLElement>(".public-hero__copy");
    const visual = hero.querySelector<HTMLElement>(".public-hero__visual");
    if (!copy || !visual) throw new Error("Hero fixture is incomplete");
    const heroBox = hero.getBoundingClientRect();
    const copyBox = copy.getBoundingClientRect();
    const visualBox = visual.getBoundingClientRect();
    return {
      heroPaddingBottom: getComputedStyle(hero).paddingBlockEnd,
      copyPaddingBottom: getComputedStyle(copy).paddingBlockEnd,
      copyCenter: (copyBox.top + copyBox.bottom) / 2,
      visualCenter: (visualBox.top + visualBox.bottom) / 2,
      visualBottom: visualBox.bottom,
      heroBottom: heroBox.bottom,
      visualAlignSelf: getComputedStyle(visual).alignSelf,
    };
  });

  expect(geometry.heroPaddingBottom).toBe("0px");
  expect(geometry.copyPaddingBottom).toBe("104px");
  expect(
    Math.abs(geometry.copyCenter - geometry.visualCenter),
  ).toBeLessThanOrEqual(0.5);
  expect(geometry.visualBottom).toBe(geometry.heroBottom);
  expect(geometry.visualAlignSelf).toBe("end");
});

test("removes desktop landing document and root spacing", async ({ page }) => {
  await visit(page, desktop);
  const spacing = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("main.landing-page");
    if (!root) throw new Error("Landing root was not rendered");
    return {
      bodyMargin: getComputedStyle(document.body).margin,
      rootPadding: getComputedStyle(root).padding,
      rootPaddingInline: getComputedStyle(root).paddingInline,
    };
  });

  expect(spacing).toEqual({
    bodyMargin: "0px",
    rootPadding: "0px",
    rootPaddingInline: "0px",
  });
});

test("keeps all links visible and clickable with JavaScript disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: mobile,
  });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await mountHeroFixture(page);
    const nav = page.getByTestId("landing-navbar-menu");
    for (const label of labels) {
      const link = nav.getByRole("link", { name: label, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toBeEnabled();
    }
    await expect(page.getByTestId("landing-navbar-menu-toggle")).toBeHidden();
    const noJsLayout = await page.evaluate(() => {
      const navbar = document.querySelector<HTMLElement>(".landing-navbar");
      const hero = document.querySelector<HTMLElement>(".public-hero");
      const copy = hero?.querySelector<HTMLElement>("h1");
      if (!navbar || !hero || !copy)
        throw new Error("No-JS layout is incomplete");
      const navbarBox = navbar.getBoundingClientRect();
      return {
        navbarPosition: getComputedStyle(navbar).position,
        navbarBottom: navbarBox.bottom,
        heroTop: hero.getBoundingClientRect().top,
        copyTop: copy.getBoundingClientRect().top,
        heroPaddingTop: getComputedStyle(hero).paddingBlockStart,
        navbarBackground: getComputedStyle(navbar).backgroundColor,
      };
    });
    expect(noJsLayout.navbarPosition).toBe("static");
    expect(noJsLayout.heroTop).toBeGreaterThanOrEqual(noJsLayout.navbarBottom);
    expect(noJsLayout.copyTop).toBeGreaterThanOrEqual(noJsLayout.navbarBottom);
    expect(noJsLayout.heroPaddingTop).toBe("48px");
    expect(noJsLayout.navbarBackground).toBe("rgb(23, 21, 21)");
    expect(
      (await page.getByTestId("landing-navbar").screenshot()).byteLength,
    ).toBeGreaterThan(0);
    await nav.getByRole("link", { name: "Inicio", exact: true }).click();
    await expect(page).toHaveURL(/#inicio$/);
  } finally {
    await context.close();
  }
});
