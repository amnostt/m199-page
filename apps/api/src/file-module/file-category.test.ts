/**
 * FileCategory unit tests (FU-05 MIME validation).
 *
 * Tests the isAllowedMime() function against the spec's MIME allowlists:
 * - Image categories: image/jpeg, image/png, image/webp, image/gif
 * - Document categories: image/* + application/pdf
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
  it("contains all expected categories", () => {
    expect(FileCategory.OUTING_MAIN_IMAGE).toBe("OUTING_MAIN_IMAGE");
    expect(FileCategory.OUTING_CROQUIS).toBe("OUTING_CROQUIS");
    expect(FileCategory.OUTING_PLAN).toBe("OUTING_PLAN");
    expect(FileCategory.POST_COVER_IMAGE).toBe("POST_COVER_IMAGE");
    expect(FileCategory.POST_DOWNLOAD).toBe("POST_DOWNLOAD");
    expect(FileCategory.LANDING_HERO).toBe("LANDING_HERO");
    expect(FileCategory.OTHER).toBe("OTHER");
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
  it("contains exactly the four image-only categories", () => {
    expect(IMAGE_CATS).toBeInstanceOf(Set);
    expect(IMAGE_CATS.has(FileCategory.OUTING_MAIN_IMAGE)).toBe(true);
    expect(IMAGE_CATS.has(FileCategory.POST_COVER_IMAGE)).toBe(true);
    expect(IMAGE_CATS.has(FileCategory.LANDING_HERO)).toBe(true);
    expect(IMAGE_CATS.has(FileCategory.OTHER)).toBe(true);
    expect(IMAGE_CATS.size).toBe(4);
  });

  it("does NOT contain document categories", () => {
    expect(IMAGE_CATS.has(FileCategory.OUTING_CROQUIS)).toBe(false);
    expect(IMAGE_CATS.has(FileCategory.OUTING_PLAN)).toBe(false);
    expect(IMAGE_CATS.has(FileCategory.POST_DOWNLOAD)).toBe(false);
  });
});

describe("isAllowedMime (FU-05)", () => {
  // --- Image categories (OUTING_MAIN_IMAGE, POST_COVER_IMAGE, LANDING_HERO, OTHER)

  describe("for image categories", () => {
    const imageCats = [
      FileCategory.OUTING_MAIN_IMAGE,
      FileCategory.POST_COVER_IMAGE,
      FileCategory.LANDING_HERO,
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

  // --- Document categories (OUTING_CROQUIS, OUTING_PLAN, POST_DOWNLOAD)

  describe("for document categories", () => {
    const docCats = [
      FileCategory.OUTING_CROQUIS,
      FileCategory.OUTING_PLAN,
      FileCategory.POST_DOWNLOAD,
    ];

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
