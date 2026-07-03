/**
 * DTO validation tests for Outings (OUT-01, OUT-04).
 *
 * Validates class-validator decorators: required fields, enum values,
 * and optional file ID fields.
 */
import { describe, it, expect } from "vitest";
import { validate } from "class-validator";
import { CreateOutingDto } from "./create-outing.dto.js";
import { UpdateOutingDto } from "./update-outing.dto.js";
import { OutingListQueryDto } from "./outing-list-query.dto.js";

function validCreateData(): Record<string, unknown> {
  return {
    title: "Camp Day 2026",
    slug: "camp-day-2026",
    dateTime: "2026-07-15T09:00:00.000Z",
    location: "Parque Central",
    description: "Una salida al parque central para acampar.",
  };
}

describe("CreateOutingDto", () => {
  // --- required fields ---

  it("rejects missing title (OUT-01 required field)", async () => {
    const dto = Object.assign(new CreateOutingDto(), {
      ...validCreateData(),
      title: undefined,
    });
    const errors = await validate(dto);
    const titleError = errors.find((e) => e.property === "title");
    expect(titleError).toBeDefined();
    expect(titleError!.constraints).toHaveProperty("isNotEmpty");
  });

  it("rejects empty title", async () => {
    const dto = Object.assign(new CreateOutingDto(), {
      ...validCreateData(),
      title: "",
    });
    const errors = await validate(dto);
    const titleError = errors.find((e) => e.property === "title");
    expect(titleError).toBeDefined();
  });

  it("rejects missing slug (OUT-03 required field)", async () => {
    const dto = Object.assign(new CreateOutingDto(), {
      ...validCreateData(),
      slug: undefined,
    });
    const errors = await validate(dto);
    const slugError = errors.find((e) => e.property === "slug");
    expect(slugError).toBeDefined();
    expect(slugError!.constraints).toHaveProperty("isNotEmpty");
  });

  it("rejects empty slug", async () => {
    const dto = Object.assign(new CreateOutingDto(), {
      ...validCreateData(),
      slug: "",
    });
    const errors = await validate(dto);
    const slugError = errors.find((e) => e.property === "slug");
    expect(slugError).toBeDefined();
  });

  it("rejects missing dateTime", async () => {
    const dto = Object.assign(new CreateOutingDto(), {
      ...validCreateData(),
      dateTime: undefined,
    });
    const errors = await validate(dto);
    const dateError = errors.find((e) => e.property === "dateTime");
    expect(dateError).toBeDefined();
    expect(dateError!.constraints).toHaveProperty("isNotEmpty");
  });

  it("rejects missing location", async () => {
    const dto = Object.assign(new CreateOutingDto(), {
      ...validCreateData(),
      location: undefined,
    });
    const errors = await validate(dto);
    const locError = errors.find((e) => e.property === "location");
    expect(locError).toBeDefined();
    expect(locError!.constraints).toHaveProperty("isNotEmpty");
  });

  it("rejects missing description", async () => {
    const dto = Object.assign(new CreateOutingDto(), {
      ...validCreateData(),
      description: undefined,
    });
    const errors = await validate(dto);
    const descError = errors.find((e) => e.property === "description");
    expect(descError).toBeDefined();
    expect(descError!.constraints).toHaveProperty("isNotEmpty");
  });

  // --- invalid status ---

  it("rejects invalid status value (OUT-01 enum)", async () => {
    const dto = Object.assign(new CreateOutingDto(), {
      ...validCreateData(),
      status: "INVALID",
    });
    const errors = await validate(dto);
    const statusError = errors.find((e) => e.property === "status");
    expect(statusError).toBeDefined();
    expect(statusError!.constraints).toHaveProperty("isEnum");
  });

  it("accepts valid status: DRAFT", async () => {
    const dto = Object.assign(new CreateOutingDto(), {
      ...validCreateData(),
      status: "DRAFT",
    });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === "status")).toHaveLength(0);
  });

  it("accepts valid status: PUBLISHED", async () => {
    const dto = Object.assign(new CreateOutingDto(), {
      ...validCreateData(),
      status: "PUBLISHED",
    });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === "status")).toHaveLength(0);
  });

  it("accepts valid status: ARCHIVED", async () => {
    const dto = Object.assign(new CreateOutingDto(), {
      ...validCreateData(),
      status: "ARCHIVED",
    });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === "status")).toHaveLength(0);
  });

  // --- happy path ---

  it("passes validation with all required fields and valid status", async () => {
    const dto = Object.assign(new CreateOutingDto(), {
      ...validCreateData(),
      status: "PUBLISHED",
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("passes validation with optional file IDs", async () => {
    const dto = Object.assign(new CreateOutingDto(), {
      ...validCreateData(),
      mainImageId: "some-file-id",
      croquisId: "some-croquis-id",
      planId: "some-plan-id",
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("passes validation without status (uses default)", async () => {
    const dto = Object.assign(new CreateOutingDto(), validCreateData());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe("UpdateOutingDto", () => {
  it("makes all CreateOutingDto fields optional", async () => {
    const dto = Object.assign(new UpdateOutingDto(), {});
    const errors = await validate(dto);
    // An empty object should be valid — all fields are optional
    expect(errors).toHaveLength(0);
  });

  it("allows updating a single field", async () => {
    const dto = Object.assign(new UpdateOutingDto(), {
      title: "Updated Title",
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("rejects invalid status on update", async () => {
    const dto = Object.assign(new UpdateOutingDto(), {
      status: "DELETED",
    });
    const errors = await validate(dto);
    const statusError = errors.find((e) => e.property === "status");
    expect(statusError).toBeDefined();
  });
});

describe("OutingListQueryDto", () => {
  it("accepts empty query (all fields optional)", async () => {
    const dto = Object.assign(new OutingListQueryDto(), {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("accepts valid status filter", async () => {
    const dto = Object.assign(new OutingListQueryDto(), {
      status: "PUBLISHED",
    });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === "status")).toHaveLength(0);
  });

  it("rejects invalid status filter", async () => {
    const dto = Object.assign(new OutingListQueryDto(), {
      status: "BOGUS",
    });
    const errors = await validate(dto);
    const statusError = errors.find((e) => e.property === "status");
    expect(statusError).toBeDefined();
  });

  it("accepts pagination fields (skip/take parsed in service)", async () => {
    const dto = Object.assign(new OutingListQueryDto(), {
      skip: 10,
      take: 20,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
