// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import LandingContact from "./LandingContact.astro";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe("LandingContact.astro — conditional channels + unconditional footer", () => {
  it("renders email and phone when both are provided", async () => {
    const html = await container.renderToString(LandingContact, {
      props: {
        contactEmail: "contacto@m199.org",
        contactPhone: "+54 11 1234-5678",
      },
    });

    expect(html).toContain('data-testid="contact-section"');
    expect(html).toContain('class="landing-contact__inner"');
    expect(html).toContain('data-testid="contact-email"');
    expect(html).toContain('data-testid="contact-phone"');
    expect(html).toContain('href="mailto:contacto@m199.org"');
    expect(html).toContain('href="tel:+541112345678"');
  });

  it("renders only the email channel when phone is null", async () => {
    const html = await container.renderToString(LandingContact, {
      props: { contactEmail: "contacto@m199.org", contactPhone: null },
    });

    expect(html).toContain('data-testid="contact-email"');
    expect(html).not.toContain('data-testid="contact-phone"');
    expect(html).not.toContain('href="tel:');
  });

  it("renders only the phone channel when email is null", async () => {
    const html = await container.renderToString(LandingContact, {
      props: { contactEmail: null, contactPhone: "+54 11 1234-5678" },
    });

    expect(html).toContain('data-testid="contact-phone"');
    expect(html).toContain('href="tel:+541112345678"');
    expect(html).not.toContain('href="mailto:');
  });

  it("normalizes whitespace and trims the visible email", async () => {
    const html = await container.renderToString(LandingContact, {
      props: {
        contactEmail: "  contacto@m199.org  ",
        contactPhone: null,
      },
    });

    expect(html).toContain('href="mailto:contacto@m199.org"');
    expect(html).toMatch(/<strong[^>]*>contacto@m199\.org<\/strong>/);
    expect(html).not.toContain("  contacto@m199.org  ");
  });

  it("hides the entire contact block when both channels are null/blank", async () => {
    const html = await container.renderToString(LandingContact, {
      props: { contactEmail: null, contactPhone: "   " },
    });

    expect(html).not.toContain('data-testid="contact-section"');
    expect(html).not.toContain('id="contacto"');
  });

  it("never renders OpenDesign placeholder contact values", async () => {
    const html = await container.renderToString(LandingContact, {
      props: { contactEmail: null, contactPhone: null },
    });

    expect(html).not.toContain("contacto@pendiente.example");
    expect(html).not.toContain("+000000000");
    expect(html).not.toContain("Email pendiente de confirmar");
    expect(html).not.toContain("Teléfono pendiente de confirmar");
  });

  it("always renders the unconditional footer", async () => {
    const html = await container.renderToString(LandingContact, {
      props: { contactEmail: null, contactPhone: null },
    });

    expect(html).toContain('data-testid="landing-footer"');
    expect(html).toContain('src="/assets/brand/logo-horizontal.png"');
    expect(html).toContain("© Misión 1-99");
  });
});
