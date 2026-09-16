import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import {
  CreatePublicationDto,
  PublicationStatus,
  PublicationType,
  PublicationQueryDto,
  UpdatePublicationDto,
} from "./publication.dto.js";

const invalidSlugs = [
  "",
  "Mision-centro",
  "mision centro",
  "Misión-centro",
  "mision_centro",
  "mision!",
  "-mision",
  "mision-",
  "mision--centro",
];

describe("publication DTOs", () => {
  it("preserves civil activity dates as YYYY-MM-DD and excludes authorId", () => {
    const dto = plainToInstance(CreatePublicationDto, {
      slug: "x",
      title: "x",
      excerpt: "x",
      content: "x",
      imageIds: ["f"],
      type: "OUTING",
      activityDate: "2026-01-02",
    });
    expect(dto.activityDate).toBe("2026-01-02");
    expect("authorId" in dto).toBe(false);
  });
  it("transforms and validates status query values through the enum", () => {
    const dto = plainToInstance(PublicationQueryDto, { status: "PUBLISHED" });
    expect(dto.status).toBe(PublicationStatus.PUBLISHED);
    expect(PublicationType.POST).toBe("POST");
  });

  it("accepts valid image and date contracts", async () => {
    const errors = await validate(
      Object.assign(new CreatePublicationDto(), {
        slug: "mision-centro-2026",
        title: "x",
        excerpt: "x",
        content: "x",
        imageIds: ["f", "g"],
        type: "OUTING",
        activityDate: "2026-01-02",
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it.each<[string[]]>([[[]], [["a", "a"]], [["a", "b", "c", "d", "e", "f"]]])(
    "rejects invalid image collections %j",
    async (imageIds) => {
      const errors = await validate(
        Object.assign(new CreatePublicationDto(), {
          slug: "mision-centro-2026",
          title: "x",
          excerpt: "x",
          content: "x",
          imageIds,
          type: "POST",
        }),
      );
      expect(errors.map((error) => error.property)).toContain("imageIds");
    },
  );

  it.each(invalidSlugs)("rejects invalid publication slug %j", async (slug) => {
    const createErrors = await validate(
      Object.assign(new CreatePublicationDto(), {
        slug,
        title: "x",
        excerpt: "x",
        content: "x",
        imageIds: ["f"],
        type: "POST",
      }),
    );
    const updateErrors = await validate(
      Object.assign(new UpdatePublicationDto(), { slug }),
    );
    expect(createErrors.map((error) => error.property)).toContain("slug");
    expect(updateErrors.map((error) => error.property)).toContain("slug");
  });
});
