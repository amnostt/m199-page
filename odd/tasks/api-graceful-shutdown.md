# API Graceful Shutdown

## Objective

Make the Nest API shut down gracefully on `SIGINT` and `SIGTERM` so Ctrl+C or process termination closes the HTTP listener and releases port 3000 together with Nest module resources.

## Problem

The API bootstrap currently starts the Nest application and listens on its configured port, but it does not explicitly enable Nest shutdown hooks. When the development process receives Ctrl+C or SIGTERM, the listener can remain alive long enough to occupy port 3000 and prevent an immediate restart.

## Why

Development and operational restarts must release the API listener deterministically. Nest's supported lifecycle shutdown path also allows module resources, including the Prisma-backed database service, to close through their existing lifecycle hooks instead of requiring process-level force termination.

## Scope

- Enable Nest shutdown hooks for both `SIGINT` and `SIGTERM` during the existing API bootstrap.
- Preserve the current AppModule creation, configuration resolution, upload-directory preparation, middleware, global validation pipe, and `app.listen` behavior.
- Ensure the shutdown path delegates to Nest's application lifecycle so the HTTP listener and module resources close cleanly.
- Add focused tests using the existing `apps/api/src/main.test.ts` Vitest bootstrap-mocking convention; do not add a process harness unless the current test seams make it practical and necessary.
- Record exact focused test, API typecheck, changed-file formatting, and `git diff --check` outcomes.

## Constraints

- Technical artifacts, code, comments, and tests are in English.
- Do not call `process.exit` as part of the bootstrap shutdown behavior; tests and lifecycle cleanup must be allowed to complete.
- Do not change startup, environment validation, global validation behavior, middleware, port resolution, or test isolation.
- Do not claim this change fixes unrelated FileService path-containment warnings.
- Do not modify dependencies, generated files, migrations, or lockfiles.
- Preserve all existing uncommitted web, public-detail, landing-music, and `.gentle-ai-default-agent.json` changes.
- Do not commit, push, open a pull request, or invoke RDD.
- The user explicitly requested the sole-writer route; no parallel writer is authorized.

## Authorized Scope

- `odd/tasks/api-graceful-shutdown.md`
- Engram project mirror at `odd/api-graceful-shutdown/tasks`
- `apps/api/src/main.ts`
- `apps/api/src/main.test.ts`
- Any additional adjacent API bootstrap test file only if the existing test convention cannot express the required lifecycle assertion without it; record the reason before changing it.

No other source, configuration, dependency, generated, web, database, or tooling files are authorized.

## Stable Task IDs

- `AGS-01` — Create and mirror this task document before source edits, then re-read both writes.
- `AGS-02` — Read the task document and map the current Nest bootstrap and API bootstrap test seams.
- `AGS-03` — Enable supported Nest shutdown hooks for `SIGINT` and `SIGTERM` without changing startup behavior.
- `AGS-04` — Add focused bootstrap tests for shutdown-hook registration and/or lifecycle closure behavior using the existing Vitest mocks.
- `AGS-05` — Run the focused API tests, relevant API typecheck, changed-file formatting check, and `git diff --check`; record exact results.
- `AGS-06` — Inspect the final diff/status for scope safety, preserve unrelated worktree changes, and close with the rollback boundary and next step recorded.

## Acceptance Criteria

- [x] Nest bootstrap enables shutdown hooks for both `SIGINT` and `SIGTERM` through the supported Nest lifecycle API.
- [x] Graceful shutdown delegates to Nest application closure so the HTTP listener and Prisma/module resources can close through lifecycle hooks.
- [x] No bootstrap shutdown path calls `process.exit`.
- [x] Existing startup behavior remains covered: configured port listening, cookie-parser registration, global `ValidationPipe`, upload-directory creation, and create-failure propagation.
- [x] Focused tests demonstrate shutdown-hook enablement without introducing an impractical process harness.
- [x] Focused API tests, relevant API typecheck, changed-file formatting check, and `git diff --check` have exact observed results recorded.
- [x] No unrelated FileService path-containment warning is represented as fixed by this task.
- [x] No dependencies, commits, pushes, PRs, RDD actions, or unrelated worktree changes are made.

## TDD Source / Runner

- **Mode:** Ordinary focused test-driven verification; strict TDD is disabled by the existing project decision, but tests remain required.
- **Source:** Existing colocated Vitest bootstrap tests in `apps/api/src/main.test.ts`, with mocked `NestFactory.create` and a fake application object.
- **Runner:** `pnpm --filter @m199/api exec vitest run src/main.test.ts`.
- **Typecheck:** `pnpm --filter @m199/api typecheck`.
- **Changed-file formatting:** `pnpm exec prettier --check odd/tasks/api-graceful-shutdown.md apps/api/src/main.ts apps/api/src/main.test.ts` (adjust only if the installed parser requires a narrower exact invocation).
- **Diff validation:** `git diff --check`.

## Checks

- [x] `pnpm --filter @m199/api exec vitest run src/main.test.ts` — passed: 1 file, 6 tests.
- [x] `pnpm --filter @m199/api typecheck` — passed: `tsc --noEmit` completed without errors.
- [x] Changed-file Prettier check — final command `pnpm exec prettier --check odd/tasks/api-graceful-shutdown.md apps/api/src/main.ts apps/api/src/main.test.ts` passed; the first run reported only the test assertion line wrapping, which was normalized and rechecked.
- [x] `git diff --check` — passed with no output.
- [x] Final `git status --short` and complete diff inspection — passed; only `apps/api/src/main.ts`, `apps/api/src/main.test.ts`, and this task document changed for this task. Existing web/public-detail/landing-music changes, `.gentle-ai-default-agent.json`, and `odd/public-detail-composition/` remain present and were not edited.

## Progress

- [x] `AGS-01` — Task document created before source edits.
- [x] `AGS-01` — Complete document mirrored to Engram under `odd/api-graceful-shutdown/tasks` for project `m199-page`.
- [x] `AGS-02` — Read task document and map current bootstrap/test seams.
- [x] `AGS-03` — Enable Nest shutdown hooks.
- [x] `AGS-04` — Add focused shutdown lifecycle coverage.
- [x] `AGS-05` — Run and record exact verification commands/results.
- [x] `AGS-06` — Final scope inspection and closure.

## Verification Evidence

Implementation evidence:

- `apps/api/src/main.ts` now calls `app.enableShutdownHooks(["SIGINT", "SIGTERM"])` immediately after `NestFactory.create(AppModule)`. Nest's supported shutdown lifecycle closes the HTTP listener and runs module shutdown hooks, allowing `DbService`/Prisma cleanup without a process-level exit.
- `apps/api/src/main.test.ts` uses the existing mocked bootstrap application and asserts the exact signal list. The existing startup tests still pass: configured port listening, cookie-parser, global validation pipe, upload directory creation, and create-failure propagation.
- `pnpm --filter @m199/api exec vitest run src/main.test.ts` — PASS, 1 file and 6 tests passed.
- `pnpm --filter @m199/api typecheck` — PASS, `tsc --noEmit` completed without errors.
- Initial `pnpm exec prettier --check odd/tasks/api-graceful-shutdown.md apps/api/src/main.ts apps/api/src/main.test.ts` — FAIL only because the new test assertion was wrapped differently from Prettier's output; the exact line was normalized.
- Final changed-file formatting command `pnpm exec prettier --check odd/tasks/api-graceful-shutdown.md apps/api/src/main.ts apps/api/src/main.test.ts` — PASS, all matched files use Prettier code style.
- `git diff --check` — PASS with no output.
- Final status/diff review — PASS for scope: API bootstrap, API bootstrap test, and this task document are the only task changes. No dependency, generated, web, public-detail, landing-music, `.gentle-ai-default-agent.json`, commit, push, PR, or RDD change was made.
- The unrelated FileService path-containment warning was not changed or treated as fixed.

## Next Step

Task implementation and requested verification are complete. No further source action is required; preserve the recorded rollback boundary if the shutdown-hook change needs to be reverted independently of unrelated worktree work.

## Rollback Boundary

The implementation can be fully rolled back by reverting only the changes in `apps/api/src/main.ts` and `apps/api/src/main.test.ts`, leaving the task record and all unrelated pending worktree changes intact. If the behavior or tests cannot be isolated to those files, stop and report the blocker rather than expanding scope.
