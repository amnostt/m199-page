import { describe, expect, it } from "vitest";
import {
  REGISTRY_COMPONENTS,
  registryArgs,
  runRegistryVerification,
  validateJsdomSafeMobileGuard,
  validateRegistryEvidence,
  type CommandResult,
} from "../../../scripts/verify-shadcn-registry.js";

const dryRunOutput = REGISTRY_COMPONENTS.map(
  (name) => `│ ~ src/components/ui/${name}.tsx overwrite`,
).join("\n");
const acceptedDiffOutput = [
  "├ src/components/ui/card.tsx (overwrite)",
  "│ │ --- compatibility-preserved Card",
  "├ src/components/ui/input.tsx (overwrite)",
  "│ │ Formatting-only changes (spacing, quotes, semicolons).",
].join("\n");
const result = (output: string, exitCode = 0): CommandResult => ({
  output,
  exitCode,
});

describe("shadcn registry drift contract", () => {
  it("freezes the component list and read-only commands", () => {
    expect(REGISTRY_COMPONENTS).toHaveLength(10);
    expect(registryArgs("dry-run").at(-1)).toBe("--dry-run");
    expect(registryArgs("diff").at(-1)).toBe("--diff");
    expect(registryArgs("dry-run")).not.toContain("--overwrite");
  });

  it("accepts the recorded shape and documented compatibility delta", () => {
    expect(
      validateRegistryEvidence({
        dryRun: result(dryRunOutput),
        diff: result(acceptedDiffOutput),
      }),
    ).toEqual([]);
  });

  it("rejects failed commands, unplanned files, and unexplained deltas", () => {
    const failed = validateRegistryEvidence({
      dryRun: result(
        `${dryRunOutput}\n│ + src/components/ui/unknown.tsx create`,
        1,
      ),
      diff: result("├ src/components/ui/button.tsx (overwrite)\n@@ change"),
    });
    expect(failed.join("\n")).toMatch(/exit.*1|unknown|button/);
  });

  it("executes both commands only through an injected unit-test runner", () => {
    const calls: string[][] = [];
    const evidence = runRegistryVerification((args) => {
      calls.push(args);
      return result(
        args.at(-1) === "--dry-run" ? dryRunOutput : acceptedDiffOutput,
      );
    });
    expect(calls).toEqual([registryArgs("dry-run"), registryArgs("diff")]);
    expect(evidence.issues).toEqual([]);
  });

  it("requires the jsdom-safe matchMedia guard", () => {
    expect(
      validateJsdomSafeMobileGuard(
        'if (typeof window.matchMedia !== "function") return false;',
      ),
    ).toEqual([]);
    expect(
      validateJsdomSafeMobileGuard("window.matchMedia()").join(),
    ).toContain("guard");
  });
});
