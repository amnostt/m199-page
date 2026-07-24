import { describe, expect, it } from "vitest";

import { resolveDatabaseUrl, runLocalDatabaseReset } from "./db-reset.js";

const LOCAL_DATABASE_URL =
  "postgresql://m199:m199@localhost:5432/m199?schema=public";

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
    const commands: Array<{ command: string; args: string[] }> = [];

    await runLocalDatabaseReset({
      databaseUrl: LOCAL_DATABASE_URL,
      runCommand: async (command, args) => {
        commands.push({ command, args });
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
  });

  it("prefers an explicitly exported DATABASE_URL over the env file", () => {
    expect(
      resolveDatabaseUrl(
        { DATABASE_URL: LOCAL_DATABASE_URL },
        "/path/that/does/not/exist",
      ),
    ).toBe(LOCAL_DATABASE_URL);
  });
});
