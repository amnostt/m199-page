import { expect, test, type Locator, type Page } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, rmSync } from "node:fs";

const desktop = { width: 1440, height: 900 };
const mobile = { width: 375, height: 800 };

const SCREENSHOT_DIR = join(tmpdir(), "m199-sidebar07-screens");

async function visitAdmin(page: Page) {
  await page.route("**/auth/refresh", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "u1",
        email: "admin@m199.org",
        displayName: "Admin User",
      }),
    }),
  );
  await page.goto("/admin");
  await expect(page.getByTestId("admin-shell")).toBeVisible();
}

test.beforeAll(() => {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test.afterAll(() => {
  rmSync(SCREENSHOT_DIR, { recursive: true, force: true });
});

async function findBodyAncestor(locator: Locator): Promise<string | null> {
  return locator.evaluate((node: Element) => {
    let current: Element | null = node.parentElement;
    while (current && current.parentElement) {
      if (current.parentElement.tagName === "BODY") return "BODY";
      current = current.parentElement;
    }
    return current?.parentElement?.tagName ?? null;
  });
}

test("renders Sidebar 07 menus without browser defaults on desktop", async ({
  page,
}) => {
  await page.setViewportSize(desktop);
  await visitAdmin(page);

  const menuStyle = await page
    .locator('[data-slot="sidebar-menu"]')
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        margin: style.margin,
        padding: style.padding,
        listStyleType: style.listStyleType,
      };
    });

  expect(menuStyle).toEqual({
    margin: "0px",
    padding: "0px",
    listStyleType: "none",
  });

  await expect(page.locator('[data-slot="sidebar-container"]')).toHaveCSS(
    "border-right-color",
    "oklch(0.922 0 0)",
  );
});

test("keeps the portaled mobile sidebar controls styled", async ({ page }) => {
  await page.setViewportSize(mobile);
  await visitAdmin(page);
  await page.getByRole("button", { name: /toggle admin sidebar/i }).click();

  const mobileSidebar = page.locator('[data-mobile="true"]');
  await expect(mobileSidebar).toBeVisible();

  const buttonStyle = await page
    .getByTestId("nav-posts")
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        appearance: style.appearance,
        backgroundColor: style.backgroundColor,
        borderStyle: style.borderStyle,
        borderWidth: style.borderWidth,
      };
    });

  expect(buttonStyle).toEqual({
    appearance: "none",
    backgroundColor: "rgba(0, 0, 0, 0)",
    borderStyle: "none",
    borderWidth: "0px",
  });
});

// Sidebar 07 canonical closure: identity in footer, header trigger/title,
// SidebarRail, mobile Sheet focus, default body portals, no custom host.

test("desktop expanded: identity lives in the sidebar footer, not the header", async ({
  page,
}) => {
  await page.setViewportSize(desktop);
  await visitAdmin(page);

  const userName = page.getByTestId("admin-user-name");
  const footerPlace = await userName.evaluate((element) => {
    const footer = element.closest('[data-slot="sidebar-footer"]');
    const header = element.closest('[data-slot="sidebar-header"]');
    return { inFooter: Boolean(footer), inHeader: Boolean(header) };
  });
  expect(footerPlace).toEqual({ inFooter: true, inHeader: false });

  const logoutPlace = await page
    .getByTestId("admin-logout")
    .evaluate((element) => {
      const footer = element.closest('[data-slot="sidebar-footer"]');
      return { inFooter: Boolean(footer) };
    });
  expect(logoutPlace).toEqual({ inFooter: true });

  const headerSize = await page
    .locator('[data-slot="sidebar-inset"] > header')
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        height: style.height,
        borderBottomWidth: style.borderBottomWidth,
      };
    });
  expect(headerSize.height).toBe("64px");
  expect(headerSize.borderBottomWidth).toBe("1px");

  await page.screenshot({
    path: join(SCREENSHOT_DIR, "admin-sidebar07-desktop-expanded.png"),
    fullPage: true,
  });
});

test("desktop collapsed: icon-only with tooltips matching the nav label", async ({
  page,
}) => {
  await page.setViewportSize(desktop);
  await visitAdmin(page);

  await page.getByRole("button", { name: /toggle admin sidebar/i }).click();
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute(
    "data-state",
    "collapsed",
  );
  await expect(
    page.locator('[data-slot="sidebar-rail"]').first(),
  ).toBeVisible();

  await page.getByTestId("nav-posts").hover();
  const tooltipContent = page.locator('[data-slot="tooltip-content"]');
  await expect(tooltipContent).toBeVisible();
  await expect(tooltipContent).toContainText("Posts");
  expect(await findBodyAncestor(tooltipContent)).toBe("BODY");

  await page.screenshot({
    path: join(SCREENSHOT_DIR, "admin-sidebar07-desktop-collapsed.png"),
    fullPage: true,
  });
});

test("mobile Sheet focus restoration and default body portal", async ({
  page,
}) => {
  await page.setViewportSize(mobile);
  await visitAdmin(page);

  const trigger = page.getByRole("button", { name: /toggle admin sidebar/i });
  await trigger.focus();
  await expect(trigger).toBeFocused();

  await trigger.click();
  const sheet = page.locator('[data-mobile="true"]');
  await expect(sheet).toBeVisible();

  expect(await findBodyAncestor(sheet)).toBe("BODY");

  const footer = sheet.locator('[data-slot="sidebar-footer"]');
  await expect(footer.getByTestId("admin-user-name")).toBeVisible();
  await expect(footer.getByTestId("admin-logout")).toBeVisible();
  expect(await page.locator("#admin-portal-root").count()).toBe(0);

  await sheet.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.screenshot({
    path: join(SCREENSHOT_DIR, "admin-sidebar07-mobile-sheet.png"),
    fullPage: true,
  });
});

test("admin route uses default shadcn admin tokens (no custom portal host)", async ({
  page,
}) => {
  await page.setViewportSize(desktop);
  await visitAdmin(page);

  expect(await page.evaluate(() => document.body.dataset.theme)).toBe("admin");
  expect(await page.locator("#admin-portal-root").count()).toBe(0);

  const sidebarBg = await page
    .locator('[data-slot="sidebar-inner"]')
    .first()
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  const borderColor = await page
    .locator('[data-slot="sidebar-container"]')
    .first()
    .evaluate((element) => getComputedStyle(element).borderRightColor);
  expect(sidebarBg).toBe("oklch(0.985 0 0)");
  expect(borderColor).toBe("oklch(0.922 0 0)");
});
