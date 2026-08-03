// @vitest-environment node

import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
// @ts-expect-error The existing test-only jsdom dependency has no local type package.
import { JSDOM } from "jsdom";
import LandingNavbar from "./LandingNavbar.astro";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe("LandingNavbar.astro — SSR contract", () => {
  it("renders four server-visible Spanish links and one Contacto CTA", async () => {
    const html = await container.renderToString(LandingNavbar, {
      props: {
        missionHref: "#misiones",
        aboutHref: "#nosotros",
        contactHref: "#contacto",
      },
    });
    const anchors = [
      ...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g),
    ];
    const labels = anchors.map(([, , content]) =>
      content!
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    );

    expect(html).toMatch(/^<header\b[^>]*data-testid="landing-navbar"/);
    expect(html).toMatch(/<nav\b[^>]*aria-label="Navegación principal"/);
    expect(html).toContain('src="/assets/brand/logo-horizontal.png"');
    expect(html).toContain('alt="Misión 1-99"');
    expect(anchors.map(([, href]) => href)).toEqual([
      "#inicio",
      "#misiones",
      "#nosotros",
      "#contacto",
    ]);
    expect(labels).toEqual(["Inicio", "Misiones", "Nosotros", "Contacto"]);
    expect(html.match(/landing-navbar__link--cta/g)).toHaveLength(1);
    expect(html).not.toContain("Publicaciones");
    expect(html).toMatch(
      /<button[^>]*aria-expanded="false"[^>]*aria-controls="landing-navbar-menu"[^>]*aria-label="Abrir menú"/,
    );
    expect(html).toContain('data-testid="landing-navbar-menu-toggle"');
  });

  it("progressively enhances the mobile menu without hiding SSR links", async () => {
    const html = await container.renderToString(LandingNavbar, {
      props: {
        missionHref: "#misiones",
        aboutHref: "#nosotros",
        contactHref: "#contacto",
      },
    });
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      pretendToBeVisual: true,
    });
    const header = dom.window.document.querySelector(".landing-navbar")!;
    const button = dom.window.document.querySelector<HTMLButtonElement>(
      "[data-testid='landing-navbar-menu-toggle']",
    )!;
    const outside = dom.window.document.body;
    const contact = dom.window.document.querySelector<HTMLAnchorElement>(
      "a[href='#contacto']",
    )!;

    expect(header.classList).toContain("landing-navbar--enhanced");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-label")).toBe("Abrir menú");

    button.click();
    expect(header.classList).toContain("landing-navbar--open");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe("Cerrar menú");

    outside.dispatchEvent(
      new dom.window.MouseEvent("click", { bubbles: true }),
    );
    expect(header.classList).toContain("landing-navbar--open");

    contact.click();
    expect(header.classList).not.toContain("landing-navbar--open");
    expect(button.getAttribute("aria-expanded")).toBe("false");

    button.click();
    contact.focus();
    header.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "Escape",
      }),
    );
    expect(header.classList).not.toContain("landing-navbar--open");
    expect(dom.window.document.activeElement).toBe(button);

    dom.window.close();
  });
});
