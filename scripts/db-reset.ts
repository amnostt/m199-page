import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { assertExpectedLocalDatabaseUrl } from "../packages/db/src/local-database.js";

type CommandRunner = (command: string, args: string[]) => Promise<number>;

type ResetOptions = {
  databaseUrl: string | undefined;
  runCommand?: CommandRunner;
  sleep?: (milliseconds: number) => Promise<void>;
  readinessAttempts?: number;
};

const READINESS_INTERVAL_MS = 1_000;
const DEFAULT_READINESS_ATTEMPTS = 60;

function spawnCommand(command: string, args: string[]): Promise<number> {
  return new Promise((resolveExit, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => resolveExit(code ?? 1));
  });
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}

function parseDotEnvValue(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function resolveDatabaseUrl(
  environment: NodeJS.ProcessEnv = process.env,
  envFilePath = resolve(process.cwd(), ".env"),
): string | undefined {
  if (environment["DATABASE_URL"]) return environment["DATABASE_URL"];

  try {
    const line = readFileSync(envFilePath, "utf8")
      .split("\n")
      .find((candidate) =>
        /^\s*(?:export\s+)?DATABASE_URL\s*=/.test(candidate),
      );
    if (!line) return undefined;

    const value = line.replace(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*/, "");
    return parseDotEnvValue(value);
  } catch {
    return undefined;
  }
}

async function runRequired(
  runner: CommandRunner,
  command: string,
  args: string[],
): Promise<void> {
  const exitCode = await runner(command, args);
  if (exitCode !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with code ${exitCode}`,
    );
  }
}

async function waitForDatabase(
  runner: CommandRunner,
  pause: (milliseconds: number) => Promise<void>,
  attempts: number,
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const exitCode = await runner("docker", [
      "compose",
      "exec",
      "-T",
      "db",
      "pg_isready",
      "-U",
      "m199",
      "-d",
      "m199",
    ]);
    if (exitCode === 0) return;
    if (attempt < attempts) await pause(READINESS_INTERVAL_MS);
  }

  throw new Error(
    `Local PostgreSQL did not become ready after ${attempts} attempts`,
  );
}

/**
 * Destructively recreates only the local Compose database, then deploys the
 * schema and explicitly runs the Prisma 7 seed command.
 */
export async function runLocalDatabaseReset(
  options: ResetOptions,
): Promise<void> {
  assertExpectedLocalDatabaseUrl(options.databaseUrl);

  const runner = options.runCommand ?? spawnCommand;
  const pause = options.sleep ?? sleep;
  const attempts = options.readinessAttempts ?? DEFAULT_READINESS_ATTEMPTS;

  await runRequired(runner, "docker", ["compose", "down", "-v"]);
  await runRequired(runner, "docker", ["compose", "up", "-d", "db"]);
  await waitForDatabase(runner, pause, attempts);
  await runRequired(runner, "pnpm", [
    "--filter",
    "@m199/db",
    "run",
    "db:migrate:deploy",
  ]);
  await runRequired(runner, "pnpm", ["--filter", "@m199/db", "run", "db:seed"]);
}

async function main(): Promise<void> {
  await runLocalDatabaseReset({
    databaseUrl: resolveDatabaseUrl(),
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  main().catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Local database reset failed",
    );
    process.exitCode = 1;
  });
}
