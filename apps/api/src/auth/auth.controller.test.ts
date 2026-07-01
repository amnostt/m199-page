/**
 * AuthController integration tests (AR-01, AR-02, AR-03).
 *
 * Proves that the auth controller routes exist, accept validated DTOs,
 * delegate to AuthService, and return the expected shapes. Uses
 * Test.createTestingModule with mocked AuthService so we assert
 * controller ↔ service wiring without real JWT/DB/crypto.
 *
 * DTO validation is exercised through the global ValidationPipe pattern;
 * cookie assertion is tested in auth.service.test.ts at the unit layer.
 */
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import type { Response } from "express";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { LoginDto } from "./dto/login.dto.js";

// ---- helpers --------------------------------------------------------------

function mockAuthService(): AuthService {
  return {
    login: vi.fn().mockResolvedValue({
      id: "u-1",
      email: "a@test.com",
      displayName: "Alice",
    }),
    refresh: vi.fn().mockResolvedValue({
      id: "u-1",
      email: "a@test.com",
      displayName: "Alice",
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    revokeAllUserSessions: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuthService;
}

// ---- tests ----------------------------------------------------------------

describe("AuthController", () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();

    authService = mockAuthService();

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
  });

  // ---- login (AR-01) -----------------------------------------------------

  describe("POST /auth/login (AR-01)", () => {
    it("delegates to AuthService.login with validated DTO", async () => {
      const dto: LoginDto = { email: "a@test.com", password: "password123" };
      const res = { cookie: vi.fn(), clearCookie: vi.fn() };

      const result = await controller.login(dto, res as unknown as Response);

      expect(authService.login).toHaveBeenCalledWith(dto, res);
      expect(result).toEqual({
        id: "u-1",
        email: "a@test.com",
        displayName: "Alice",
      });
    });
  });

  // ---- refresh (AR-02) ----------------------------------------------------

  describe("POST /auth/refresh (AR-02)", () => {
    it("delegates to AuthService.refresh with request and response", async () => {
      const req = {
        cookies: { refresh_token: "token" },
      } as unknown as import("express").Request;
      const res = { cookie: vi.fn(), clearCookie: vi.fn() };

      const result = await controller.refresh(req, res as unknown as Response);

      expect(authService.refresh).toHaveBeenCalledWith(req, res);
      expect(result).toEqual({
        id: "u-1",
        email: "a@test.com",
        displayName: "Alice",
      });
    });
  });

  // ---- logout (AR-03) -----------------------------------------------------

  describe("POST /auth/logout (AR-03)", () => {
    it("delegates to AuthService.logout and returns confirmation", async () => {
      const req = {
        cookies: { refresh_token: "token" },
      } as unknown as import("express").Request;
      const res = { cookie: vi.fn(), clearCookie: vi.fn() };

      const result = await controller.logout(req, res as unknown as Response);

      expect(authService.logout).toHaveBeenCalledWith(req, res);
      expect(result).toEqual({ message: "Logged out" });
    });
  });

  // ---- DTO validation (LoginDto) -----------------------------------------

  describe("LoginDto validation", () => {
    it("rejects non-email email with 400", async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });

      try {
        await pipe.transform(
          { email: "not-an-email", password: "password123" },
          { type: "body", metatype: LoginDto },
        );
        expect.unreachable("Expected BadRequestException");
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const resp = (error as BadRequestException).getResponse();
        expect(resp).toHaveProperty("statusCode", 400);
        expect(Array.isArray((resp as Record<string, unknown>).message)).toBe(
          true,
        );
      }
    });

    it("rejects short password (< 8 chars) with 400", async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });

      try {
        await pipe.transform(
          { email: "a@test.com", password: "short" },
          { type: "body", metatype: LoginDto },
        );
        expect.unreachable("Expected BadRequestException");
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it("accepts valid LoginDto", async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });

      const result = await pipe.transform(
        { email: "a@test.com", password: "password123" },
        { type: "body", metatype: LoginDto },
      );

      expect(result).toBeInstanceOf(LoginDto);
      expect(result.email).toBe("a@test.com");
    });
  });

  // ---- module wiring (smoke test) ----------------------------------------

  it("compiles with a mock AuthService", () => {
    expect(controller).toBeDefined();
  });
});
