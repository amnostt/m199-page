/**
 * FileCategory unit tests (FU-05 MIME validation, file-categories spec).
 *
 * Tests the isAllowedMime() function against the spec's MIME allowlists:
 * - Image categories: image/jpeg, image/png, image/webp, image/gif
 * - Document categories: image/* + application/pdf
 *
 * Approved vocabulary only: MISSION_HERO, PUBLICATION_FEATURED_IMAGE,
 * PUBLICATION_DOWNLOAD, LANDING_HERO, LANDING_VISUAL_BREAK, OTHER. Legacy POST_/OUTING_ values
 * are NOT representable.
 */
import { describe, it, expect } from "vitest";
import {
  FileCategory,
  IMAGE_MIMES,
  DOC_MIMES,
  IMAGE_CATS,
  isAllowedMime,
} from "./file-category.js";

describe("FileCategory enum", () => {
  it("contains the approved Mission/Publication vocabulary", () => {
    expect(FileCategory.MISSION_HERO).toBe("MISSION_HERO");
    expect(FileCategory.PUBLICATION_FEATURED_IMAGE).toBe(
      "PUBLICATION_FEATURED_IMAGE",
    );
    expect(FileCategory.PUBLICATION_DOWNLOAD).toBe("PUBLICATION_DOWNLOAD");
    expect(FileCategory.LANDING_HERO).toBe("LANDING_HERO");
    expect(FileCategory.LANDING_VISUAL_BREAK).toBe("LANDING_VISUAL_BREAK");
    expect(FileCategory.OTHER).toBe("OTHER");
  });

  it("does NOT expose legacy POST_/OUTING_ categories", () => {
    expect((FileCategory as Record<string, unknown>).OUTING_MAIN_IMAGE).toBe(
      undefined,
    );
    expect((FileCategory as Record<string, unknown>).OUTING_CROQUIS).toBe(
      undefined,
    );
    expect((FileCategory as Record<string, unknown>).OUTING_PLAN).toBe(
      undefined,
    );
    expect((FileCategory as Record<string, unknown>).POST_COVER_IMAGE).toBe(
      undefined,
    );
    expect((FileCategory as Record<string, unknown>).POST_DOWNLOAD).toBe(
      undefined,
    );
  });
});

describe("IMAGE_MIMES", () => {
  it("contains the four standard image MIME types", () => {
    expect(IMAGE_MIMES).toContain("image/jpeg");
    expect(IMAGE_MIMES).toContain("image/png");
    expect(IMAGE_MIMES).toContain("image/webp");
    expect(IMAGE_MIMES).toContain("image/gif");
    expect(IMAGE_MIMES).toHaveLength(4);
  });
});

describe("DOC_MIMES", () => {
  it("extends IMAGE_MIMES with application/pdf", () => {
    expect(DOC_MIMES).toContain("application/pdf");
    for (const mime of IMAGE_MIMES) {
      expect(DOC_MIMES).toContain(mime);
    }
    expect(DOC_MIMES).toHaveLength(5);
  });
});

describe("IMAGE_CATS", () => {
  it("contains exactly the approved image-only categories", () => {
    expect(IMAGE_CATS).toBeInstanceOf(Set);
    expect(IMAGE_CATS.has(FileCategory.MISSION_HERO)).toBe(true);
    expect(IMAGE_CATS.has(FileCategory.PUBLICATION_FEATURED_IMAGE)).toBe(true);
    expect(IMAGE_CATS.has(FileCategory.LANDING_HERO)).toBe(true);
    expect(IMAGE_CATS.has(FileCategory.LANDING_VISUAL_BREAK)).toBe(true);
    expect(IMAGE_CATS.has(FileCategory.OTHER)).toBe(true);
    expect(IMAGE_CATS.size).toBe(5);
  });

  it("does NOT contain PUBLICATION_DOWNLOAD (document category)", () => {
    expect(IMAGE_CATS.has(FileCategory.PUBLICATION_DOWNLOAD)).toBe(false);
  });
});

describe("isAllowedMime (FU-05)", () => {
  // --- Image categories (MISSION_HERO, PUBLICATION_FEATURED_IMAGE,
  //     LANDING_HERO, LANDING_VISUAL_BREAK, OTHER)

  describe("for image categories", () => {
    const imageCats = [
      FileCategory.MISSION_HERO,
      FileCategory.PUBLICATION_FEATURED_IMAGE,
      FileCategory.LANDING_HERO,
      FileCategory.LANDING_VISUAL_BREAK,
      FileCategory.OTHER,
    ];

    it("returns true for image/jpeg", () => {
      for (const cat of imageCats) {
        expect(isAllowedMime(cat, "image/jpeg")).toBe(true);
      }
    });

    it("returns true for image/png", () => {
      for (const cat of imageCats) {
        expect(isAllowedMime(cat, "image/png")).toBe(true);
      }
    });

    it("returns true for image/webp", () => {
      for (const cat of imageCats) {
        expect(isAllowedMime(cat, "image/webp")).toBe(true);
      }
    });

    it("returns true for image/gif", () => {
      for (const cat of imageCats) {
        expect(isAllowedMime(cat, "image/gif")).toBe(true);
      }
    });

    it("returns false for application/pdf", () => {
      for (const cat of imageCats) {
        expect(isAllowedMime(cat, "application/pdf")).toBe(false);
      }
    });

    it("returns false for text/plain", () => {
      for (const cat of imageCats) {
        expect(isAllowedMime(cat, "text/plain")).toBe(false);
      }
    });

    it("returns false for application/octet-stream", () => {
      for (const cat of imageCats) {
        expect(isAllowedMime(cat, "application/octet-stream")).toBe(false);
      }
    });
  });

  // --- Document categories (PUBLICATION_DOWNLOAD)

  describe("for document categories", () => {
    const docCats = [FileCategory.PUBLICATION_DOWNLOAD];

    it("returns true for image/* MIME types", () => {
      for (const cat of docCats) {
        expect(isAllowedMime(cat, "image/jpeg")).toBe(true);
        expect(isAllowedMime(cat, "image/png")).toBe(true);
        expect(isAllowedMime(cat, "image/webp")).toBe(true);
        expect(isAllowedMime(cat, "image/gif")).toBe(true);
      }
    });

    it("returns true for application/pdf", () => {
      for (const cat of docCats) {
        expect(isAllowedMime(cat, "application/pdf")).toBe(true);
      }
    });

    it("returns false for text/plain", () => {
      for (const cat of docCats) {
        expect(isAllowedMime(cat, "text/plain")).toBe(false);
      }
    });

    it("returns false for application/octet-stream", () => {
      for (const cat of docCats) {
        expect(isAllowedMime(cat, "application/octet-stream")).toBe(false);
      }
    });
  });
});
