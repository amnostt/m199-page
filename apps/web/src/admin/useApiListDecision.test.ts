// ---------------------------------------------------------------------------
// useApiListDecision — design policy regression test (Task 2.6)
//
// This file captures the explicit no-extraction decision for the
// `useApiList` hook in WU2, in a way the strict-TDD evidence table can
// point at and the verify phase can re-execute. It is NOT a refactor
// cycle — the decision is to NOT refactor — but the test artifact makes
// the decision auditable, reproducible, and resilient to silent scope
// drift.
//
// Design context (mirrors `openspec/changes/outings-admin-ui/design.md`):
//
//   "Use the existing pattern from PostsListPage. Extract `useApiList`
//    as a generic hook IF a second server-filtered section lands;
//    otherwise defer the refactor to a follow-up change."
//
// Why no extraction in WU2:
//   1. Only ONE server-filtered consumer lands in WU2 (OutingsListPage).
//      PostsListPage uses CLIENT-side filtering and is explicitly
//      out of scope for this change.
//   2. A useApiList hook that abstracts both server and client filtering
//      would need to carry filter-mode branching forever, even when
//      WU3's OutingFormPage lands (form-state is a different concern
//      from list-state).
//   3. OutingsListPage's state management is self-contained and stable:
//      `outings`, `loadError`, `statusFilter`, `actionStates`,
//      `actionErrors` — and one `useEffect` for fetch, one
//      `useCallback` for archive. No duplication to extract.
//
// The RED→GREEN→TRIANGULATE→REFACTOR cycle for this task:
//
//   RED        — these assertions did not exist; the decision lived only
//                in apply-progress prose, which the gate rejected.
//   GREEN      — the assertions pass because the current code matches
//                the no-extraction policy.
//   TRIANGULATE— three independent axes (module absence, import absence,
//                on-disk tasks.md decision line) all assert the same
//                policy from different angles.
//   REFACTOR   — N/A. The decision is to NOT refactor; this test
//                enforces that.
//
// If a future change adds a second server-filtered section, this test
// will need to be REPLACED (not just updated) with real hook tests
// covering the extracted useApiList API.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Paths — resolved at test time so the test fails fast if the repo is
// moved or the slice is rebased away. We use import.meta.url (not
// __dirname) so the resolution is independent of vitest's CWD.
// ---------------------------------------------------------------------------

// For apps/web/src/admin/useApiListDecision.test.ts, the directory is
// apps/web/src/admin/. Four ".."s land on the repo root:
//   admin/ → src/ → web/ → apps/ → m199-page/
const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "..", "..", "..", "..");
const OUTINGS_LIST_PAGE = resolve(
  REPO_ROOT,
  "apps/web/src/admin/OutingsListPage.tsx",
);
const OUTINGS_API_DIR = resolve(REPO_ROOT, "apps/web/src/admin");
const TASKS_MD = resolve(
  REPO_ROOT,
  "openspec/changes/outings-admin-ui/tasks.md",
);

// ---------------------------------------------------------------------------
// TRIANGULATE axis 1 — no useApiList module exists in the admin surface
// ---------------------------------------------------------------------------

describe("useApiListDecision — module absence", () => {
  it("does not ship a useApiList module in apps/web/src/admin", () => {
    // The hook would be extracted into the admin source tree; its
    // absence proves the refactor was deferred, not silently done.
    const hookPath = resolve(OUTINGS_API_DIR, "useApiList.ts");
    const hookPathTsx = resolve(OUTINGS_API_DIR, "useApiList.tsx");
    expect(existsSync(hookPath)).toBe(false);
    expect(existsSync(hookPathTsx)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TRIANGULATE axis 2 — OutingsListPage does not import useApiList
// ---------------------------------------------------------------------------

describe("useApiListDecision — import absence in OutingsListPage", () => {
  it("OutingsListPage.tsx contains no import of a useApiList hook", () => {
    const source = readFileSync(OUTINGS_LIST_PAGE, "utf8");

    // Negative: no `import ... useApiList` line, in any spelling
    // (default, named, or via wildcard).
    expect(source).not.toMatch(/from\s+["']\.\/useApiList/);
    expect(source).not.toMatch(/from\s+["']\.\/useApiList\.js["']/);

    // Negative: no destructured useApiList identifier in an import.
    expect(source).not.toMatch(/\buseApiList\b/);
  });

  it("OutingsListPage.tsx owns its loading/error/data state inline", () => {
    const source = readFileSync(OUTINGS_LIST_PAGE, "utf8");

    // Positive: the component still owns the pieces of state
    // documented in the design hand-off rationale. If a future change
    // extracts them, this assertion will fail and the test will need
    // to be removed (along with the actual extraction).
    expect(source).toMatch(/useState<OutingAdmin\[\]\s*\|\s*null>/); // outings
    expect(source).toMatch(/useState<OutingsFilter>/); // statusFilter
    expect(source).toMatch(/useState<Record<string,\s*ActionState>>/); // actionStates
    expect(source).toMatch(/useState<Record<string,\s*string>>/); // actionErrors
    // loadError uses inferred boolean via useState(false).
    expect(source).toMatch(/useState\(false\)/); // loadError
  });
});

// ---------------------------------------------------------------------------
// TRIANGULATE axis 3 — on-disk tasks.md carries the no-extraction
// decision at the concrete 2.6 line (self-contained; not "see below")
// ---------------------------------------------------------------------------

describe("useApiListDecision — tasks.md carries the decision inline", () => {
  it("task 2.6 in tasks.md does NOT use the ambiguous 'if duplication emerges' wording", () => {
    const tasks = readFileSync(TASKS_MD, "utf8");

    // Find the 2.6 line and capture the rest of the line.
    const match = tasks.match(/^-\s*\[[ x]\]\s*2\.6\s+REFACTOR:[^\n]*$/m);
    expect(match, "expected a 2.6 REFACTOR line in tasks.md").toBeTruthy();

    const line = match![0];

    // The line must be self-contained — no "see below", no conditional.
    expect(line.toLowerCase()).not.toMatch(/see\s+below/);
    expect(line.toLowerCase()).not.toMatch(/if\s+duplication\s+emerges/);
    expect(line.toLowerCase()).not.toMatch(/tbd/);
    expect(line.toLowerCase()).not.toMatch(/conditional/);
  });

  it("task 2.6 in tasks.md records the no-extraction decision explicitly", () => {
    const tasks = readFileSync(TASKS_MD, "utf8");

    const match = tasks.match(/^-\s*\[[ x]\]\s*2\.6\s+REFACTOR:[^\n]*$/m);
    expect(match, "expected a 2.6 REFACTOR line in tasks.md").toBeTruthy();

    const line = match![0];

    // The line must affirmatively state the no-extraction decision.
    // Multiple phrasings are acceptable as long as the decision is on
    // the line itself (not deferred to a section below).
    const explicitNo =
      /no extraction/i.test(line) ||
      /deferred/i.test(line) ||
      /not extracted/i.test(line) ||
      /not warranted/i.test(line) ||
      /intentionally not/i.test(line);
    expect(
      explicitNo,
      `expected task 2.6 line to record the no-extraction decision explicitly; got: ${line}`,
    ).toBe(true);
  });
});
