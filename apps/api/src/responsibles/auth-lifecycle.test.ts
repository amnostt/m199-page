/** Cross-layer family lifecycle regression: login, rotation, logout, denial. */
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { describe, it, expect, vi } from "vitest";
import { AuthService } from "../auth/auth.service.js";
import { DbService } from "../db/db.service.js";

const user = {
  id: "u-1",
  email: "alice@test.com",
  displayName: "Alice",
  passwordHash: "hash",
  authVersion: 0,
  status: "ACTIVE" as const,
};

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn().mockResolvedValue(true) },
}));

function response() {
  return { cookie: vi.fn(), clearCookie: vi.fn(), setHeader: vi.fn() };
}

describe("family auth lifecycle", () => {
  it("does not resurrect a terminal family after logout", async () => {
    const families = new Map<string, Record<string, unknown>>();
    const operations = new Map<string, Record<string, unknown>>();
    const tokens = new Map<string, Record<string, unknown>>();
    let tokenNumber = 0;

    const client = {
      responsibleUser: {
        findUnique: vi.fn(async () => user),
        update: vi.fn(
          async ({
            data,
          }: {
            data: { authVersion: { increment: number } };
          }) => {
            user.authVersion += data.authVersion.increment;
            return user;
          },
        ),
      },
      refreshSession: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      refreshFamily: {
        findUnique: vi.fn(
          async ({ where }: { where: { id: string } }) =>
            families.get(where.id) ?? null,
        ),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          families.set(data.id as string, data);
          return data;
        }),
        update: vi.fn(
          async ({
            where,
            data,
          }: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => {
            const family = families.get(where.id)!;
            Object.assign(family, data);
            return family;
          },
        ),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      refreshOperation: {
        findFirst: vi.fn(
          async ({ where }: { where: Record<string, unknown> }) =>
            [...operations.values()].find((operation) =>
              Object.entries(where).every(
                ([key, value]) => operation[key] === value,
              ),
            ) ?? null,
        ),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          operations.set(data.id as string, data);
          return data;
        }),
        updateMany: vi.fn(
          async ({
            where,
            data,
          }: {
            where: { familyId: string };
            data: Record<string, unknown>;
          }) => {
            for (const operation of operations.values())
              if (operation.familyId === where.familyId)
                Object.assign(operation, data);
            return { count: 1 };
          },
        ),
      },
      $queryRaw: vi.fn(
        async (_strings: TemplateStringsArray, familyId: string) =>
          families.has(familyId) ? [{ id: familyId }] : [],
      ),
      $transaction: vi.fn(async (fn: (tx: typeof client) => Promise<unknown>) =>
        fn(client),
      ),
    };
    const jwt = {
      sign: vi.fn((payload: Record<string, unknown>) => {
        const token = `${payload.type === "refresh" ? "refresh" : "access"}-${++tokenNumber}`;
        if (payload.type === "refresh")
          tokens.set(token, {
            ...payload,
            exp: Math.floor(Date.now() / 1000) + 60_000,
          });
        return token;
      }),
      verify: vi.fn(
        (token: string) =>
          tokens.get(token) ??
          (() => {
            throw new Error("invalid");
          })(),
      ),
    };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwt },
        { provide: DbService, useValue: { client } },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => "lifecycle-test-jwt-secret" },
        },
      ],
    }).compile();
    const service = module.get(AuthService);

    const loginResponse = response();
    await service.login(
      { email: user.email, password: "password123" },
      loginResponse as never,
    );
    const refreshToken = loginResponse.cookie.mock.calls.find(
      ([name]) => name === "refresh_token",
    )?.[1] as string;

    await service.logout(
      { cookies: { refresh_token: refreshToken }, headers: {} } as never,
      response() as never,
    );
    await expect(
      service.refresh(
        { cookies: { refresh_token: refreshToken }, headers: {} } as never,
        response() as never,
      ),
    ).rejects.toThrow("Refresh family is terminated");
    expect(user.authVersion).toBe(1);
  });
});
