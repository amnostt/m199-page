import { expect, test } from "@playwright/test";

const constrainedDesktop = { width: 1024, height: 844 };
const mission = {
  id: "mission-1",
  slug: "una-mision-con-un-slug-deliberadamente-extenso",
  title: "Una misión con un título deliberadamente extenso",
  heroImageId: "image-1",
  profileImageId: null,
  heroPhrase:
    "Una frase suficientemente extensa para forzar que las columnas superen el ancho disponible del viewport.",
  status: "ACTIVE",
  createdAt: "2026-08-18T00:00:00.000Z",
  updatedAt: "2026-08-18T00:00:00.000Z",
};

test("confines mission table overflow to its horizontal scroll container", async ({
  page,
}) => {
  await page.setViewportSize(constrainedDesktop);
  await page.route("**/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "x-refresh-family-version": "1" },
      body: JSON.stringify({
        id: "admin-1",
        email: "admin@example.com",
        displayName: "Admin",
      }),
    });
  });
  await page.route("**/missions/admin/active", async (route) => {
    await route.fulfill({ json: [mission] });
  });
  await page.route("**/missions/admin/archived", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.goto("/admin");
  await page.getByTestId("nav-missions").click();
  const tableContainer = page.locator('[data-slot="table-container"]');
  await expect(tableContainer).toBeVisible();

  const geometry = await page.evaluate(() => {
    const container = document.querySelector<HTMLElement>(
      '[data-slot="table-container"]',
    );
    if (!container) throw new Error("Mission table container was not rendered");
    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      containerClientWidth: container.clientWidth,
      containerScrollWidth: container.scrollWidth,
      overflowX: getComputedStyle(container).overflowX,
    };
  });

  expect(geometry.documentScrollWidth).toBe(geometry.documentClientWidth);
  expect(geometry.containerClientWidth).toBeLessThanOrEqual(
    geometry.documentClientWidth,
  );
  expect(geometry.containerScrollWidth).toBeGreaterThan(
    geometry.containerClientWidth,
  );
  expect(geometry.overflowX).toBe("auto");

  const scrolledLeft = await tableContainer.evaluate((container) => {
    container.scrollLeft = container.scrollWidth;
    return container.scrollLeft;
  });
  expect(scrolledLeft).toBeGreaterThan(0);
});
