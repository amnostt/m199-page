import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateMissionDto } from "./create-mission.dto.js";
import { UpdateMissionDto } from "./update-mission.dto.js";
import { UpdateMissionStatusDto } from "./update-mission-status.dto.js";

describe("Mission DTOs", () => {
  it("requires every create field, including heroPhrase", async () => {
    const errors = await validate(
      Object.assign(new CreateMissionDto(), {
        title: "Title",
        slug: "slug",
        heroImageId: "file",
      }),
    );
    expect(errors.map((error) => error.property)).toContain("heroPhrase");
  });

  it("accepts partial updates but rejects empty supplied values", async () => {
    expect(
      await validate(Object.assign(new UpdateMissionDto(), { title: "New" })),
    ).toHaveLength(0);
    expect(
      await validate(Object.assign(new UpdateMissionDto(), { title: "" })),
    ).not.toHaveLength(0);
  });

  it("only accepts ACTIVE or ARCHIVED status", async () => {
    expect(
      await validate(
        Object.assign(new UpdateMissionStatusDto(), { status: "DRAFT" }),
      ),
    ).not.toHaveLength(0);
  });
});
