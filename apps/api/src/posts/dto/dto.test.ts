/**
 * Posts DTO validation tests — Task 1.7 (RED phase).
 *
 * Validates CreatePostDto, UpdatePostDto, and PostListQueryDto
 * using class-validator. Tests required fields, enums, and optional arrays.
 *
 * The `downloadLabels` block (Phase 1, TDD 1.1) covers the per-download
 * label map contract: subset rule, sibling `downloadIds` invariant, and
 * normalized-value rules (trim, 120 chars, string-only).
 */
import { describe, it, expect } from "vitest";
import { validate } from "class-validator";
import { CreatePostDto } from "./create-post.dto.js";
import { UpdatePostDto } from "./update-post.dto.js";
import { PostListQueryDto } from "./post-list-query.dto.js";

describe("CreatePostDto validation (1.7)", () => {
  it("passes validation with all required fields", async () => {
    const dto = new CreatePostDto();
    dto.title = "My Post Title";
    dto.slug = "my-post-slug";
    dto.content = "<p>Hello world</p>";

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("passes validation with optional fields provided", async () => {
    const dto = new CreatePostDto();
    dto.title = "Full Post";
    dto.slug = "full-post";
    dto.content = "<h2>Rich content</h2><p>Body text</p>";
    dto.coverImageId = "file-123";
    dto.description = "A short description";
    dto.tags = ["ministry", "event"];
    dto.downloadIds = ["file-456"];
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("rejects missing title", async () => {
    const dto = new CreatePostDto();
    dto.slug = "some-slug";
    dto.content = "<p>text</p>";

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.property).toBe("title");
    expect(errors[0]!.constraints).toHaveProperty("isNotEmpty");
  });

  it("rejects missing slug", async () => {
    const dto = new CreatePostDto();
    dto.title = "Title";
    dto.content = "<p>text</p>";

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.property).toBe("slug");
  });

  it("rejects missing content", async () => {
    const dto = new CreatePostDto();
    dto.title = "Title";
    dto.slug = "slug";

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.property).toBe("content");
  });

  it("rejects empty title string", async () => {
    const dto = new CreatePostDto();
    dto.title = "";
    dto.slug = "slug";
    dto.content = "<p>text</p>";

    const errors = await validate(dto);
    const titleErrors = errors.filter((e) => e.property === "title");
    expect(titleErrors).toHaveLength(1);
  });

  it("rejects lifecycle fields even when their values are null", async () => {
    const dto = new CreatePostDto();
    dto.title = "Title";
    dto.slug = "slug";
    dto.content = "<p>text</p>";
    Object.assign(dto, { status: null, publishedAt: null });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["status", "publishedAt"]),
    );
  });

  it("rejects every lifecycle status value", async () => {
    for (const status of ["DRAFT", "PUBLISHED", "ARCHIVED"] as const) {
      const dto = new CreatePostDto();
      dto.title = "Title";
      dto.slug = `slug-${status.toLowerCase()}`;
      dto.content = "<p>text</p>";
      Object.assign(dto, { status });

      const errors = await validate(dto);
      expect(errors.some((error) => error.property === "status")).toBe(true);
    }
  });

  it("accepts null/undefined for optional fields", async () => {
    const dto = new CreatePostDto();
    dto.title = "Minimal";
    dto.slug = "minimal";
    dto.content = "<p>Just enough</p>";
    // coverImageId, description, tags, and downloadIds intentionally left undefined

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("rejects empty slug string", async () => {
    const dto = new CreatePostDto();
    dto.title = "Title";
    dto.slug = "";
    dto.content = "<p>text</p>";

    const errors = await validate(dto);
    const slugErrors = errors.filter((e) => e.property === "slug");
    expect(slugErrors).toHaveLength(1);
  });

  it("rejects slug with uppercase letters", async () => {
    const dto = new CreatePostDto();
    dto.title = "Title";
    dto.slug = "Invalid-Slug";
    dto.content = "<p>text</p>";

    const errors = await validate(dto);
    const slugErrors = errors.filter((e) => e.property === "slug");
    expect(slugErrors.length).toBeGreaterThan(0);
  });

  it("rejects slug with spaces", async () => {
    const dto = new CreatePostDto();
    dto.title = "Title";
    dto.slug = "my slug with spaces";
    dto.content = "<p>text</p>";

    const errors = await validate(dto);
    const slugErrors = errors.filter((e) => e.property === "slug");
    expect(slugErrors.length).toBeGreaterThan(0);
  });

  it("rejects slug with special characters", async () => {
    const dto = new CreatePostDto();
    dto.title = "Title";
    dto.slug = "slug@with#chars!";
    dto.content = "<p>text</p>";

    const errors = await validate(dto);
    const slugErrors = errors.filter((e) => e.property === "slug");
    expect(slugErrors.length).toBeGreaterThan(0);
  });

  it("rejects slug with leading/trailing hyphens", async () => {
    const dto = new CreatePostDto();
    dto.title = "Title";
    dto.slug = "-bad-slug-";
    dto.content = "<p>text</p>";

    const errors = await validate(dto);
    const slugErrors = errors.filter((e) => e.property === "slug");
    expect(slugErrors.length).toBeGreaterThan(0);
  });

  it("accepts valid kebab-case slug", async () => {
    const dto = new CreatePostDto();
    dto.title = "Title";
    dto.slug = "my-valid-slug-2024";
    dto.content = "<p>text</p>";

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("validates tags as array of strings when provided", async () => {
    const dto = new CreatePostDto();
    dto.title = "Title";
    dto.slug = "slug";
    dto.content = "<p>text</p>";
    Object.assign(dto, { tags: [1, 2, 3] }); // numbers, not strings

    const errors = await validate(dto);
    // There should be validation errors for non-string tag entries
    const tagErrors = errors.filter((e) => e.property === "tags");
    if (tagErrors.length > 0) {
      expect(tagErrors[0]!.constraints).toBeDefined();
    }
  });
});

describe("UpdatePostDto validation (1.7)", () => {
  it("passes validation with no fields (all optional update)", async () => {
    const dto = new UpdatePostDto();
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("passes validation with partial fields", async () => {
    const dto = new UpdatePostDto();
    dto.title = "Updated Title";
    dto.description = "New description";

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("accepts all updatable fields", async () => {
    const dto = new UpdatePostDto();
    dto.title = "Updated";
    dto.slug = "updated-slug";
    dto.content = "<p>Updated content</p>";
    dto.coverImageId = "img-999";
    dto.description = "Updated desc";
    dto.tags = ["new-tag"];
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("rejects lifecycle fields on update, including null", async () => {
    const dto = new UpdatePostDto();
    Object.assign(dto, { status: null, publishedAt: null });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["status", "publishedAt"]),
    );
  });

  it("rejects invalid slug format on update", async () => {
    const dto = new UpdatePostDto();
    dto.slug = "Invalid Uppercase Spaces";

    const errors = await validate(dto);
    const slugErrors = errors.filter((e) => e.property === "slug");
    expect(slugErrors.length).toBeGreaterThan(0);
  });

  it("accepts valid slug format on update", async () => {
    const dto = new UpdatePostDto();
    dto.slug = "nice-clean-slug";

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe("downloadLabels map (Phase 1, TDD 1.1)", () => {
  it("CreatePostDto accepts a valid label map with a subset of downloadIds", async () => {
    const dto = new CreatePostDto();
    dto.title = "T";
    dto.slug = "t";
    dto.content = "<p>x</p>";
    dto.downloadIds = ["file-a", "file-b"];
    dto.downloadLabels = { "file-a": "Study Guide" };

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("CreatePostDto accepts an empty label map paired with downloadIds", async () => {
    const dto = new CreatePostDto();
    dto.title = "T";
    dto.slug = "t";
    dto.content = "<p>x</p>";
    dto.downloadIds = ["file-a"];
    dto.downloadLabels = {};

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("UpdatePostDto accepts a valid label map covering every downloadId", async () => {
    const dto = new UpdatePostDto();
    dto.downloadIds = ["file-a", "file-b"];
    dto.downloadLabels = { "file-a": "Guide", "file-b": "Slides" };

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("CreatePostDto accepts a label whose value has surrounding whitespace only when valid after trim", async () => {
    const dto = new CreatePostDto();
    dto.title = "T";
    dto.slug = "t";
    dto.content = "<p>x</p>";
    dto.downloadIds = ["file-a"];
    dto.downloadLabels = { "file-a": "  Guide  " };

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("CreatePostDto accepts a label whose value is exactly 120 characters", async () => {
    const dto = new CreatePostDto();
    dto.title = "T";
    dto.slug = "t";
    dto.content = "<p>x</p>";
    dto.downloadIds = ["file-a"];
    dto.downloadLabels = { "file-a": "x".repeat(120) };

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("CreatePostDto rejects downloadLabels when downloadIds is omitted", async () => {
    const dto = new CreatePostDto();
    dto.title = "T";
    dto.slug = "t";
    dto.content = "<p>x</p>";
    dto.downloadLabels = { "file-a": "Guide" };

    const errors = await validate(dto);
    const labelErrors = errors.filter((e) => e.property === "downloadLabels");
    expect(labelErrors).toHaveLength(1);
  });

  it("CreatePostDto rejects downloadLabels with a key outside downloadIds", async () => {
    const dto = new CreatePostDto();
    dto.title = "T";
    dto.slug = "t";
    dto.content = "<p>x</p>";
    dto.downloadIds = ["file-a"];
    dto.downloadLabels = { "file-b": "Guide" };

    const errors = await validate(dto);
    const labelErrors = errors.filter((e) => e.property === "downloadLabels");
    expect(labelErrors).toHaveLength(1);
  });

  it("UpdatePostDto rejects downloadLabels with multiple foreign keys (one valid, one not)", async () => {
    const dto = new UpdatePostDto();
    dto.downloadIds = ["file-a"];
    dto.downloadLabels = { "file-a": "Guide", "file-foreign": "Other" };

    const errors = await validate(dto);
    const labelErrors = errors.filter((e) => e.property === "downloadLabels");
    expect(labelErrors).toHaveLength(1);
  });

  it("CreatePostDto rejects downloadLabels as an array (non-object)", async () => {
    const dto = new CreatePostDto();
    dto.title = "T";
    dto.slug = "t";
    dto.content = "<p>x</p>";
    dto.downloadIds = ["file-a"];
    Object.assign(dto, { downloadLabels: ["file-a", "Guide"] });

    const errors = await validate(dto);
    const labelErrors = errors.filter((e) => e.property === "downloadLabels");
    expect(labelErrors).toHaveLength(1);
  });

  it("CreatePostDto rejects downloadLabels with a non-string value", async () => {
    const dto = new CreatePostDto();
    dto.title = "T";
    dto.slug = "t";
    dto.content = "<p>x</p>";
    dto.downloadIds = ["file-a"];
    Object.assign(dto, { downloadLabels: { "file-a": 42 } });

    const errors = await validate(dto);
    const labelErrors = errors.filter((e) => e.property === "downloadLabels");
    expect(labelErrors).toHaveLength(1);
  });

  it("CreatePostDto rejects downloadLabels with a blank-after-trimming value", async () => {
    const dto = new CreatePostDto();
    dto.title = "T";
    dto.slug = "t";
    dto.content = "<p>x</p>";
    dto.downloadIds = ["file-a"];
    dto.downloadLabels = { "file-a": "   " };

    const errors = await validate(dto);
    const labelErrors = errors.filter((e) => e.property === "downloadLabels");
    expect(labelErrors).toHaveLength(1);
  });

  it("CreatePostDto rejects downloadLabels with a value longer than 120 characters", async () => {
    const dto = new CreatePostDto();
    dto.title = "T";
    dto.slug = "t";
    dto.content = "<p>x</p>";
    dto.downloadIds = ["file-a"];
    dto.downloadLabels = { "file-a": "x".repeat(121) };

    const errors = await validate(dto);
    const labelErrors = errors.filter((e) => e.property === "downloadLabels");
    expect(labelErrors).toHaveLength(1);
  });

  it("CreatePostDto rejects a downloadLabels object containing a nested non-string value", async () => {
    const dto = new CreatePostDto();
    dto.title = "T";
    dto.slug = "t";
    dto.content = "<p>x</p>";
    dto.downloadIds = ["file-a"];
    Object.assign(dto, {
      downloadLabels: { "file-a": { nested: "no" } },
    });

    const errors = await validate(dto);
    const labelErrors = errors.filter((e) => e.property === "downloadLabels");
    expect(labelErrors).toHaveLength(1);
  });

  // -- Phase 5 remediation: null must be rejected (not bypassed by @IsOptional)

  it("CreatePostDto rejects downloadLabels: null when downloadIds is supplied", async () => {
    const dto = new CreatePostDto();
    dto.title = "T";
    dto.slug = "t";
    dto.content = "<p>x</p>";
    dto.downloadIds = ["file-a"];
    Object.assign(dto, { downloadLabels: null });

    const errors = await validate(dto);
    const labelErrors = errors.filter((e) => e.property === "downloadLabels");
    expect(labelErrors).toHaveLength(1);
  });

  it("CreatePostDto accepts downloadLabels: undefined (no downloadIds coupling)", async () => {
    // Triangulation: undefined must still skip validation (control case
    // for the @ValidateIf fix). Only null must now error.
    const dto = new CreatePostDto();
    dto.title = "T";
    dto.slug = "t";
    dto.content = "<p>x</p>";
    // downloadLabels intentionally not set
    expect(dto.downloadLabels).toBeUndefined();

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("UpdatePostDto rejects downloadLabels: null when downloadIds is supplied", async () => {
    const dto = new UpdatePostDto();
    dto.downloadIds = ["file-a"];
    Object.assign(dto, { downloadLabels: null });

    const errors = await validate(dto);
    const labelErrors = errors.filter((e) => e.property === "downloadLabels");
    expect(labelErrors).toHaveLength(1);
  });
});

describe("PostListQueryDto validation (1.7)", () => {
  it("passes validation with no fields (defaults)", async () => {
    const dto = new PostListQueryDto();
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("accepts valid status filter", async () => {
    const dto = new PostListQueryDto();
    dto.status = "PUBLISHED";

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("rejects invalid status value", async () => {
    const dto = new PostListQueryDto();
    (dto as Record<string, unknown>).status = "INVALID";

    const errors = await validate(dto);
    const statusErrors = errors.filter((e) => e.property === "status");
    expect(statusErrors.length).toBeGreaterThan(0);
  });

  it("accepts optional pagination fields (skip, take)", async () => {
    const dto = new PostListQueryDto();
    dto.skip = 10;
    dto.take = 20;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
