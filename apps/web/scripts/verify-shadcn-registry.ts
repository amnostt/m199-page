import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REGISTRY_COMPONENTS = [
  "button",
  "card",
  "input",
  "select",
  "textarea",
  "table",
  "alert-dialog",
  "dialog",
  "sheet",
  "tooltip",
] as const;
const scriptDir = dirname(fileURLToPath(import.meta.url));
export const REGISTRY_CWD = resolve(scriptDir, "..");
const expected = new Set(
  REGISTRY_COMPONENTS.map((name) => `src/components/ui/${name}.tsx`),
);
const accepted = new Set([
  "src/components/ui/card.tsx",
  "src/components/ui/select.tsx",
  "src/components/ui/alert-dialog.tsx",
  "src/components/ui/tooltip.tsx",
]);
const dryRunPattern = /[│|]\s*[+~]\s+(src\/components\/ui\/[^\s]+\.tsx)/g;
const diffPattern =
  /(?:^|\n)├\s+(src\/components\/ui\/[^\s)]+\.tsx)[^\n]*[\s\S]*?(?=\n├|\n└|$)/g;

type CommandRunner = (args: string[]) => CommandResult;
export type CommandResult = { exitCode: number; output: string };
export type RegistryEvidence = {
  dryRun: CommandResult;
  diff: CommandResult;
  issues: string[];
};

export function registryArgs(mode: "dry-run" | "diff"): string[] {
  return [
    "dlx",
    "shadcn@latest",
    "add",
    ...REGISTRY_COMPONENTS,
    mode === "dry-run" ? "--dry-run" : "--diff",
  ];
}

export function parseDryRunFiles(output: string): Set<string> {
  return new Set([...output.matchAll(dryRunPattern)].map((match) => match[1]!));
}

function diffSections(output: string): Map<string, string> {
  return new Map(
    [...output.matchAll(diffPattern)].map((match) => [match[1]!, match[0]]),
  );
}

export function validateRegistryEvidence({
  dryRun,
  diff,
}: {
  dryRun: CommandResult;
  diff: CommandResult;
}): string[] {
  const issues: string[] = [];
  if (dryRun.exitCode)
    issues.push(`dry-run exited with code ${dryRun.exitCode}`);
  if (diff.exitCode) issues.push(`diff exited with code ${diff.exitCode}`);
  const files = parseDryRunFiles(dryRun.output);
  for (const path of expected)
    if (!files.has(path)) issues.push(`dry-run is missing: ${path}`);
  for (const path of files)
    if (!expected.has(path)) issues.push(`unplanned dry-run file: ${path}`);
  for (const [path, section] of diffSections(diff.output)) {
    if (!expected.has(path)) issues.push(`unplanned registry diff: ${path}`);
    else if (
      !section.includes("Formatting-only changes") &&
      !accepted.has(path)
    )
      issues.push(`unexplained registry delta: ${path}`);
  }
  return issues;
}

function runCommand(args: string[]): CommandResult {
  const result = spawnSync("pnpm", args, {
    cwd: REGISTRY_CWD,
    encoding: "utf8",
  });
  return {
    exitCode: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}${result.error?.message ?? ""}`,
  };
}

export function runRegistryVerification(
  runner: CommandRunner = runCommand,
): RegistryEvidence {
  const dryRun = runner(registryArgs("dry-run"));
  const diff = runner(registryArgs("diff"));
  return { dryRun, diff, issues: validateRegistryEvidence({ dryRun, diff }) };
}

export function validateJsdomSafeMobileGuard(source: string): string[] {
  return /typeof\s+window\.matchMedia\s*!==\s*["']function["']/.test(source)
    ? []
    : ["matchMedia guard is missing from use-mobile.ts"];
}

export function main(): void {
  const evidence = runRegistryVerification();
  const guard = readFileSync(
    resolve(REGISTRY_CWD, "src/hooks/use-mobile.ts"),
    "utf8",
  );
  const issues = [...evidence.issues, ...validateJsdomSafeMobileGuard(guard)];
  console.log(
    `registry-drift-verification cwd=${REGISTRY_CWD} dry-run=${evidence.dryRun.exitCode} diff=${evidence.diff.exitCode}`,
  );
  if (issues.length) {
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
  } else console.log("PASS: no unplanned or unexplained registry drift");
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
)
  main();
