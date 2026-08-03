import { expect, test, type Page } from "@playwright/test";

const desktop = { width: 1440, height: 900 };
const mobile = { width: 375, height: 800 };

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
