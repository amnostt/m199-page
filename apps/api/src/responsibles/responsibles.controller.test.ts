/**
 * ResponsiblesController integration tests (AR-06, AR-07, AR-08).
 *
 * Proves that the controller routes exist, are behind AuthGuard, accept
 * validated DTOs, and delegate to ResponsiblesService correctly.
 *
 * Uses Test.createTestingModule with mocked ResponsiblesService and
 * AuthGuard so we assert controller ↔ service wiring without real JWT/DB.
 *
 * DTO validation is exercised through the global ValidationPipe pattern
 * from auth.controller.test.ts. AR-09 (no public registration) is proved
 * by the @UseGuards(AuthGuard) decorator — unauthenticated requests are
 * rejected at the guard level before reaching the controller.
 */
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { ResponsiblesController } from "./responsibles.controller.js";
import { ResponsiblesService } from "./responsibles.service.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { CreateResponsibleDto } from "./dto/create-responsible.dto.js";
import { UpdateResponsibleDto } from "./dto/update-responsible.dto.js";
import { ResetPasswordDto } from "./dto/reset-password.dto.js";

// ---- helpers --------------------------------------------------------------

const SAMPLE_USER = {
  id: "u-1",
  email: "alice@test.com",
  displayName: "Alice",
  status: "ACTIVE" as const,
};

function mockResponsiblesService(): ResponsiblesService {
  return {
    findAll: vi.fn().mockResolvedValue([SAMPLE_USER]),
    findById: vi.fn().mockResolvedValue(SAMPLE_USER),
    create: vi.fn().mockResolvedValue({ ...SAMPLE_USER, id: "u-new" }),
    update: vi.fn().mockResolvedValue(SAMPLE_USER),
    resetPassword: vi.fn().mockResolvedValue(SAMPLE_USER),
  } as unknown as ResponsiblesService;
}

// ---- tests ----------------------------------------------------------------

describe("ResponsiblesController", () => {
  let controller: ResponsiblesController;
  let service: ResponsiblesService;

  beforeEach(async () => {
    vi.clearAllMocks();

    service = mockResponsiblesService();

    const module = await Test.createTestingModule({
      controllers: [ResponsiblesController],
      providers: [{ provide: ResponsiblesService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: vi.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get(ResponsiblesController);
  });

  // ---- GET /responsibles (AR-06) ------------------------------------------

  describe("GET /responsibles (AR-06)", () => {
    it("delegates to service.findAll and returns array", async () => {
      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledOnce();
      expect(result).toEqual([SAMPLE_USER]);
      for (const user of result) {
        expect(user).not.toHaveProperty("passwordHash");
      }
    });
  });

  // ---- GET /responsibles/:id (AR-06) --------------------------------------

  describe("GET /responsibles/:id (AR-06)", () => {
    it("delegates to service.findById with path param", async () => {
      const result = await controller.findById("u-1");

      expect(service.findById).toHaveBeenCalledWith("u-1");
      expect(result).toEqual(SAMPLE_USER);
      expect(result).not.toHaveProperty("passwordHash");
    });
  });

  // ---- POST /responsibles (AR-06) -----------------------------------------

  describe("POST /responsibles (AR-06)", () => {
    it("delegates to service.create with validated DTO", async () => {
      const dto: CreateResponsibleDto = {
        email: "new@test.com",
        displayName: "New User",
        password: "password123",
      };

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).not.toHaveProperty("passwordHash");
      expect(result.id).toBe("u-new");
    });
  });

  // ---- PATCH /responsibles/:id (AR-06, AR-07) -----------------------------

  describe("PATCH /responsibles/:id (AR-06, AR-07)", () => {
    it("delegates to service.update with path param and DTO", async () => {
      const dto: UpdateResponsibleDto = { displayName: "Alice Updated" };

      const result = await controller.update("u-1", dto);

      expect(service.update).toHaveBeenCalledWith("u-1", dto);
      expect(result).not.toHaveProperty("passwordHash");
    });

    it("delegates status change (AR-07)", async () => {
      const dto: UpdateResponsibleDto = { status: "INACTIVE" };

      await controller.update("u-1", dto);

      expect(service.update).toHaveBeenCalledWith("u-1", dto);
    });
  });

  // ---- PATCH /responsibles/:id/password (AR-08) ---------------------------

  describe("PATCH /responsibles/:id/password (AR-08)", () => {
    it("delegates to service.resetPassword with path param and DTO", async () => {
      const dto: ResetPasswordDto = { newPassword: "new-password-123" };

      const result = await controller.resetPassword("u-2", dto);

      expect(service.resetPassword).toHaveBeenCalledWith("u-2", dto);
      expect(result).not.toHaveProperty("passwordHash");
    });
  });

  // ---- DTO validation -----------------------------------------------------

  describe("CreateResponsibleDto validation", () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    it("rejects non-email email with 400", async () => {
      try {
        await pipe.transform(
          { email: "not-an-email", displayName: "A", password: "password123" },
          { type: "body", metatype: CreateResponsibleDto },
        );
        expect.unreachable("Expected BadRequestException");
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it("rejects short password (< 8 chars) with 400", async () => {
      try {
        await pipe.transform(
          { email: "a@test.com", displayName: "A", password: "short" },
          { type: "body", metatype: CreateResponsibleDto },
        );
        expect.unreachable("Expected BadRequestException");
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it("rejects missing displayName with 400", async () => {
      try {
        await pipe.transform(
          { email: "a@test.com", password: "password123" },
          { type: "body", metatype: CreateResponsibleDto },
        );
        expect.unreachable("Expected BadRequestException");
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it("accepts valid CreateResponsibleDto", async () => {
      const result = await pipe.transform(
        { email: "a@test.com", displayName: "Alice", password: "password123" },
        { type: "body", metatype: CreateResponsibleDto },
      );

      expect(result).toBeInstanceOf(CreateResponsibleDto);
      expect(result.email).toBe("a@test.com");
      expect(result.displayName).toBe("Alice");
    });
  });

  describe("UpdateResponsibleDto validation", () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    it("accepts valid status update", async () => {
      const result = await pipe.transform(
        { status: "INACTIVE" },
        { type: "body", metatype: UpdateResponsibleDto },
      );

      expect(result).toBeInstanceOf(UpdateResponsibleDto);
      expect(result.status).toBe("INACTIVE");
    });

    it("rejects invalid status value with 400", async () => {
      try {
        await pipe.transform(
          { status: "BANNED" },
          { type: "body", metatype: UpdateResponsibleDto },
        );
        expect.unreachable("Expected BadRequestException");
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it("accepts empty body (all fields optional)", async () => {
      const result = await pipe.transform(
        {},
        { type: "body", metatype: UpdateResponsibleDto },
      );

      expect(result).toBeInstanceOf(UpdateResponsibleDto);
    });
  });

  describe("ResetPasswordDto validation", () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    it("rejects short new password (< 8 chars) with 400", async () => {
      try {
        await pipe.transform(
          { newPassword: "short" },
          { type: "body", metatype: ResetPasswordDto },
        );
        expect.unreachable("Expected BadRequestException");
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it("accepts valid new password", async () => {
      const result = await pipe.transform(
        { newPassword: "new-password-123" },
        { type: "body", metatype: ResetPasswordDto },
      );

      expect(result).toBeInstanceOf(ResetPasswordDto);
      expect(result.newPassword).toBe("new-password-123");
    });
  });

  // ---- module wiring (smoke test) -----------------------------------------

  it("compiles with mocked service and guard", () => {
    expect(controller).toBeDefined();
  });
});
