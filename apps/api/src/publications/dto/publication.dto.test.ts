import { plainToInstance } from "class-transformer";
import { describe, expect, it } from "vitest";
import {
  CreatePublicationDto,
  PublicationStatus,
  PublicationType,
  PublicationQueryDto,
} from "./publication.dto.js";

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
});
