import { expect, test, type Page } from "@playwright/test";

const mobile = { width: 390, height: 844 };
const desktop = { width: 1440, height: 900 };
const labels = ["Inicio", "Misiones", "Nosotros", "Contacto"];

async function visit(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto("/");
  await expect(page.getByTestId("landing-navbar")).toBeVisible();
}

test("enhances the compact mobile menu with accessible state transitions", async ({
  page,
}) => {
  await visit(page, mobile);
  const header = page.getByTestId("landing-navbar");
  const trigger = page.getByTestId("landing-navbar-menu-toggle");
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
    width: "176px",
    height: "45px",
    visibility: "visible",
    opacity: "1",
  });
  expect((await logo.screenshot()).byteLength).toBeGreaterThan(0);

  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toHaveAttribute("aria-label", "Abrir menú");
  await trigger.click();
  await expect(header).toHaveClass(/landing-navbar--open/);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(trigger).toHaveAttribute("aria-label", "Cerrar menú");

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
    const nav = page.getByTestId("landing-navbar-menu");
    for (const label of labels) {
      const link = nav.getByRole("link", { name: label, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toBeEnabled();
    }
    await expect(page.getByTestId("landing-navbar-menu-toggle")).toBeHidden();
    await nav.getByRole("link", { name: "Inicio", exact: true }).click();
    await expect(page).toHaveURL(/#inicio$/);
  } finally {
    await context.close();
  }
});
