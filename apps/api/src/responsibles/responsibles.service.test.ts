/**
 * ResponsiblesService unit tests (AR-06, AR-07, AR-08).
 *
 * Proves CRUD, status enforcement, password reset, and session revocation
 * using mocked DbService + AuthService. Follows the pattern from
 * auth.service.test.ts: Test.createTestingModule with explicit provider
 * overrides, hoisted bcryptjs mock, and per-test fixture builders.
 *
 * bcryptjs's hash is mocked at the module level so tests are deterministic
 * and never perform real hashing.
 */
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- hoisted mocks --------------------------------------------------------
const { hashMock } = vi.hoisted(() => ({
  hashMock: vi.fn<(password: string, salt: number) => Promise<string>>(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: hashMock,
  },
}));

// ---- imports after mocks --------------------------------------------------
import { ConflictException, NotFoundException } from "@nestjs/common";
import {
  ResponsiblesService,
  type ResponsibleUserResponse,
} from "./responsibles.service.js";
import { DbService } from "../db/db.service.js";
import { AuthService } from "../auth/auth.service.js";

// ---- test data ------------------------------------------------------------

interface UserOverride {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  status: "ACTIVE" | "INACTIVE";
}

const ALICE: UserOverride = {
  id: "u-1",
  email: "alice@test.com",
  displayName: "Alice",
  passwordHash: "$2b$hashed",
  status: "ACTIVE",
};

const BOB: UserOverride = {
  id: "u-2",
  email: "bob@test.com",
  displayName: "Bob",
  passwordHash: "$2b$other",
  status: "ACTIVE",
};

const CHARLIE_INACTIVE: UserOverride = {
  id: "u-3",
  email: "charlie@test.com",
  displayName: "Charlie",
  passwordHash: "$2b$third",
  status: "INACTIVE",
};

// ---- helpers --------------------------------------------------------------

interface MockDbOverrides {
  /** Override findUnique results (e.g. for duplicate-email checks). */
  findUniqueResults?: Map<string, UserOverride | null>;
  /** Users returned by findMany. */
  findAll?: UserOverride[];
  /** Users returned by findUnique calls keyed by lookup type. */
  findById?: UserOverride | null;
  /** Created user to return. */
  createReturn?: UserOverride;
  /** Updated user to return. */
  updateReturn?: UserOverride;
}

function makeDbValue(overrides: MockDbOverrides = {}) {
  const findMany = vi.fn().mockResolvedValue(overrides.findAll ?? [ALICE, BOB]);

  // findUnique is called with different where clauses — we map "id:<val>" or
  // "email:<val>" to a result from the overrides or default to null for
  // missing users and the first user in the list otherwise.
  const findUnique = vi
    .fn()
    .mockImplementation(async (args: { where: Record<string, unknown> }) => {
      if (overrides.findUniqueResults) {
        const key = args.where["id"] ?? args.where["email"];
        if (key && overrides.findUniqueResults.has(key as string)) {
          return overrides.findUniqueResults.get(key as string) ?? null;
        }
      }
      // Default: if looking up by id, check against our known users.
      if (args.where["id"] && overrides.findById !== undefined) {
        return overrides.findById;
      }
      if (args.where["email"]) {
        // For email lookups during create duplicate check, default null.
        return null;
      }
      // General fallback — return first active user.
      return ALICE;
    });

  const create = vi.fn().mockResolvedValue(overrides.createReturn ?? ALICE);

  const update = vi.fn().mockResolvedValue(overrides.updateReturn ?? ALICE);

  const client = {
    responsibleUser: {
      findMany,
      findUnique,
      create,
      update,
    },
  };

  return {
    client,
    findMany,
    findUnique,
    create,
    update,
  };
}

function makeAuthServiceValue() {
  return {
    revokeAllUserSessions: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuthService;
}

interface ServiceFixture {
  service: ResponsiblesService;
  mocks: ReturnType<typeof makeDbValue>;
  authService: ReturnType<typeof makeAuthServiceValue>;
}

async function buildService(
  dbOverrides: MockDbOverrides = {},
): Promise<ServiceFixture> {
  hashMock.mockResolvedValue("$2b$mocked-hash");

  const authService = makeAuthServiceValue();
  const dbValue = makeDbValue(dbOverrides);

  const module = await Test.createTestingModule({
    providers: [
      ResponsiblesService,
      { provide: DbService, useValue: dbValue },
      { provide: AuthService, useValue: authService },
    ],
  }).compile();

  return {
    service: module.get(ResponsiblesService),
    mocks: dbValue,
    authService,
  };
}

// ---- tests ----------------------------------------------------------------

describe("ResponsiblesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- findAll ------------------------------------------------------------

  describe("findAll (AR-06)", () => {
    it("returns all users without passwordHash", async () => {
      const { service } = await buildService({
        findAll: [ALICE, BOB, CHARLIE_INACTIVE],
      });

      const result = await service.findAll();

      expect(result).toHaveLength(3);
      for (const user of result) {
        expect(user).not.toHaveProperty("passwordHash");
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("email");
        expect(user).toHaveProperty("displayName");
        expect(user).toHaveProperty("status");
      }
    });

    it("returns empty array when no users exist", async () => {
      const { service } = await buildService({ findAll: [] });

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ---- findById -----------------------------------------------------------

  describe("findById (AR-06)", () => {
    it("returns a user without passwordHash", async () => {
      const { service } = await buildService({ findById: ALICE });

      const result = await service.findById(ALICE.id);

      expect(result).toEqual<ResponsibleUserResponse>({
        id: ALICE.id,
        email: ALICE.email,
        displayName: ALICE.displayName,
        status: ALICE.status,
      });
    });

    it("throws 404 when user does not exist", async () => {
      const { service } = await buildService({ findById: null });

      await expect(service.findById("nope")).rejects.toThrow(
        new NotFoundException("User not found"),
      );
    });
  });

  // ---- create (AR-06) -----------------------------------------------------

  describe("create (AR-06)", () => {
    it("creates a user and returns it without passwordHash", async () => {
      const { service, mocks } = await buildService({
        createReturn: {
          id: "u-new",
          email: "new@test.com",
          displayName: "New User",
          passwordHash: "$2b$mocked-hash",
          status: "ACTIVE",
        },
      });

      const result = await service.create({
        email: "new@test.com",
        displayName: "New User",
        password: "password123",
      });

      expect(hashMock).toHaveBeenCalledWith("password123", 10);
      expect(mocks.create).toHaveBeenCalledWith({
        data: {
          email: "new@test.com",
          displayName: "New User",
          passwordHash: "$2b$mocked-hash",
        },
      });
      expect(result).toEqual<ResponsibleUserResponse>({
        id: "u-new",
        email: "new@test.com",
        displayName: "New User",
        status: "ACTIVE",
      });
      expect(result).not.toHaveProperty("passwordHash");
    });

    it("throws 409 on duplicate email", async () => {
      const findUniqueResults = new Map<string, UserOverride | null>();
      findUniqueResults.set(ALICE.email, ALICE);

      const { service } = await buildService({ findUniqueResults });

      await expect(
        service.create({
          email: ALICE.email,
          displayName: "Duplicate",
          password: "password123",
        }),
      ).rejects.toThrow(new ConflictException("Email already in use"));
    });
  });

  // ---- update (AR-06, AR-07) ----------------------------------------------

  describe("update (AR-06, AR-07)", () => {
    it("updates displayName and returns user without passwordHash", async () => {
      const updated: UserOverride = {
        ...ALICE,
        displayName: "Alice Updated",
      };
      const { service, mocks } = await buildService({
        findById: ALICE,
        updateReturn: updated,
      });

      const result = await service.update(ALICE.id, {
        displayName: "Alice Updated",
      });

      expect(mocks.update).toHaveBeenCalledWith({
        where: { id: ALICE.id },
        data: { displayName: "Alice Updated" },
      });
      expect(result).toEqual<ResponsibleUserResponse>({
        id: ALICE.id,
        email: ALICE.email,
        displayName: "Alice Updated",
        status: ALICE.status,
      });
    });

    it("updates status and returns without passwordHash", async () => {
      const updated: UserOverride = {
        ...ALICE,
        status: "INACTIVE",
      };
      const { service, mocks } = await buildService({
        findById: ALICE,
        updateReturn: updated,
      });

      const result = await service.update(ALICE.id, {
        status: "INACTIVE",
      });

      expect(mocks.update).toHaveBeenCalledWith({
        where: { id: ALICE.id },
        data: { status: "INACTIVE" },
      });
      expect(result.status).toBe("INACTIVE");
    });

    it("revokes all sessions when status is set to INACTIVE (AR-07)", async () => {
      const updated: UserOverride = {
        ...ALICE,
        status: "INACTIVE",
      };
      const { service, authService } = await buildService({
        findById: ALICE,
        updateReturn: updated,
      });

      await service.update(ALICE.id, { status: "INACTIVE" });

      expect(authService.revokeAllUserSessions).toHaveBeenCalledWith(ALICE.id);
    });

    it("does NOT revoke sessions when status stays ACTIVE", async () => {
      const { service, authService } = await buildService({
        findById: ALICE,
        updateReturn: ALICE,
      });

      await service.update(ALICE.id, { displayName: "Still Active" });

      expect(authService.revokeAllUserSessions).not.toHaveBeenCalled();
    });

    it("throws 404 when user does not exist", async () => {
      const { service } = await buildService({ findById: null });

      await expect(
        service.update("nope", { displayName: "X" }),
      ).rejects.toThrow(new NotFoundException("User not found"));
    });
  });

  // ---- resetPassword (AR-08) ----------------------------------------------

  describe("resetPassword (AR-08)", () => {
    it("hashes new password, updates user, and revokes all sessions", async () => {
      const updated: UserOverride = {
        ...ALICE,
        passwordHash: "$2b$new-hash",
      };
      const { service, mocks, authService } = await buildService({
        findById: ALICE,
        updateReturn: updated,
      });

      const result = await service.resetPassword(ALICE.id, {
        newPassword: "new-password-123",
      });

      expect(hashMock).toHaveBeenCalledWith("new-password-123", 10);
      expect(mocks.update).toHaveBeenCalledWith({
        where: { id: ALICE.id },
        data: { passwordHash: "$2b$mocked-hash" },
      });
      expect(authService.revokeAllUserSessions).toHaveBeenCalledWith(ALICE.id);
      expect(result).not.toHaveProperty("passwordHash");
    });

    it("throws 404 when user does not exist", async () => {
      const { service } = await buildService({ findById: null });

      await expect(
        service.resetPassword("nope", { newPassword: "newpass123" }),
      ).rejects.toThrow(new NotFoundException("User not found"));
    });
  });
});
