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
  it("converts date-only input to UTC midnight and excludes authorId from the contract", () => {
    const dto = plainToInstance(CreatePublicationDto, {
      slug: "x",
      title: "x",
      excerpt: "x",
      content: "x",
      featuredImageId: "f",
      type: "POST",
      startDate: "2026-01-02",
    });
    expect(dto.startDate).toEqual(new Date("2026-01-02T00:00:00.000Z"));
    expect("authorId" in dto).toBe(false);
  });
  it("transforms and validates status query values through the enum", () => {
    const dto = plainToInstance(PublicationQueryDto, { status: "PUBLISHED" });
    expect(dto.status).toBe(PublicationStatus.PUBLISHED);
    expect(PublicationType.POST).toBe("POST");
  });

  it("accepts valid hyphenated slugs in create and update DTOs", async () => {
    const createErrors = await validate(
      Object.assign(new CreatePublicationDto(), {
        slug: "mision-centro-2026",
        title: "x",
        excerpt: "x",
        content: "x",
        featuredImageId: "f",
        type: "POST",
      }),
    );
    const updateErrors = await validate(
      Object.assign(new UpdatePublicationDto(), {
        slug: "mision-centro-2026",
      }),
    );
    expect(createErrors).toHaveLength(0);
    expect(updateErrors).toHaveLength(0);
  });

  it.each(invalidSlugs)("rejects invalid publication slug %j", async (slug) => {
    const createErrors = await validate(
      Object.assign(new CreatePublicationDto(), {
        slug,
        title: "x",
        excerpt: "x",
        content: "x",
        featuredImageId: "f",
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
