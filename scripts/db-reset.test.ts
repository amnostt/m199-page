import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  resolveDatabaseUrl,
  resolvePostgresHostPort,
  runLocalDatabaseReset,
} from "./db-reset.js";

const LOCAL_DATABASE_URL =
  "postgresql://m199:m199@localhost:5433/m199?schema=public";

describe("local database reset", () => {
  it("refuses unsafe targets before running destructive commands", async () => {
    const commands: string[] = [];

    await expect(
      runLocalDatabaseReset({
        databaseUrl: "postgresql://m199:m199@example.com:5432/m199",
        runCommand: async (command) => {
          commands.push(command);
          return 0;
        },
      }),
    ).rejects.toThrow("Refusing local database operation");

    expect(commands).toEqual([]);
  });

  it("resets, waits for readiness, migrates, and explicitly seeds", async () => {
    const commands: Array<{
      command: string;
      args: string[];
      environment: NodeJS.ProcessEnv | undefined;
    }> = [];
    const configuredDatabaseUrl =
      "postgresql://m199:m199@localhost:5544/m199?schema=public";

    await runLocalDatabaseReset({
      databaseUrl: configuredDatabaseUrl,
      postgresHostPort: "5544",
      runCommand: async (command, args, environment) => {
        commands.push({ command, args, environment });
        return 0;
      },
      readinessAttempts: 1,
    });

    expect(commands.map(({ command, args }) => [command, ...args])).toEqual([
      ["docker", "compose", "down", "-v"],
      ["docker", "compose", "up", "-d", "db"],
      [
        "docker",
        "compose",
        "exec",
        "-T",
        "db",
        "pg_isready",
        "-U",
        "m199",
        "-d",
        "m199",
      ],
      ["pnpm", "--filter", "@m199/db", "run", "db:migrate:deploy"],
      ["pnpm", "--filter", "@m199/db", "run", "db:seed"],
    ]);
    expect(
      commands.every(
        ({ environment }) => environment?.["POSTGRES_HOST_PORT"] === "5544",
      ),
    ).toBe(true);
  });

  it("prefers an explicitly exported DATABASE_URL over the env file", () => {
    expect(
      resolveDatabaseUrl(
        { DATABASE_URL: LOCAL_DATABASE_URL },
        "/path/that/does/not/exist",
      ),
    ).toBe(LOCAL_DATABASE_URL);
  });

  it("resolves an explicitly exported PostgreSQL host port", () => {
    expect(
      resolvePostgresHostPort(
        { POSTGRES_HOST_PORT: "5544" },
        "/path/that/does/not/exist",
      ),
    ).toBe("5544");
  });

  it("resolves the PostgreSQL host port from the env file fallback", () => {
    const directory = mkdtempSync(join(tmpdir(), "m199-db-reset-"));
    const envFilePath = join(directory, ".env");

    try {
      writeFileSync(envFilePath, "POSTGRES_HOST_PORT=5544\n", "utf8");

      expect(resolvePostgresHostPort({}, envFilePath)).toBe("5544");
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
