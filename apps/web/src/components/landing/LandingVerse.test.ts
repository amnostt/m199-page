// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import LandingVerse from "./LandingVerse.astro";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe("LandingVerse.astro — dynamic verse block", () => {
  it("renders the verse text and reference from the validated payload", async () => {
    const html = await container.renderToString(LandingVerse, {
      props: {
        verse: {
          text: "Porque el Hijo del Hombre vino a buscar y a salvar lo que se había perdido.",
          reference: "Lucas 19:10",
        },
      },
    });

    expect(html).toContain('data-testid="verse-section"');
    expect(html).toContain('data-testid="verse-text"');
    expect(html).toContain('data-testid="verse-reference"');
    expect(html).not.toContain("Palabra del día");
    expect(html).toContain(
      "Porque el Hijo del Hombre vino a buscar y a salvar lo que se había perdido.",
    );
    expect(html).toContain("Lucas 19:10");
  });

  it("omits the entire section when the payload has no verse", async () => {
    const html = await container.renderToString(LandingVerse, {
      props: { verse: null },
    });

    expect(html).not.toContain('data-testid="verse-section"');
    expect(html).not.toContain('data-testid="verse-text"');
    expect(html).not.toContain('data-testid="verse-reference"');
  });

  it("never renders placeholder verse copy from the OpenDesign draft", async () => {
    const html = await container.renderToString(LandingVerse, {
      props: {
        verse: {
          text: "Versículo real",
          reference: "Mateo 28:19",
        },
      },
    });

    expect(html).not.toContain("Versículo pendiente");
  });
});
