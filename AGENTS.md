# Repository Contributor Guide

Use this guide for changes to the current Mision 1-99 monorepo. Prefer the
smallest bounded change, keep tests with the behavior they protect, and verify
claims against code and configuration because some documentation retains
historical implementation notes.

The normative workflow for SDD sequencing, runtime evidence, rollback
boundaries, and review budget is [docs/development-process.md](docs/development-process.md).
Use it together with this contributor guide; each document links back to the
other.

## Repository Map

| Path          | Responsibility                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `apps/web`    | React 19/Vite public site and admin UI; Vitest uses jsdom and Testing Library.                            |
| `apps/api`    | NestJS API organized by feature modules: auth, responsibles, files, landing, outings, posts, and verses.  |
| `packages/db` | Prisma schema, config, migrations, seed, and the shared Prisma client factory.                            |
| `docs`        | Documentation index, product context, technical state, roadmap, process, glossary, and learning material. |
| `compose.yml` | Local PostgreSQL 16 service and persistent named volume.                                                  |

The workspace uses pnpm, strict TypeScript, ESM, Vitest, ESLint, and Prettier.
Supported runtimes are Node `^20.19.0 || >=22.12.0` and pnpm `>=9`; the pinned
package manager is `pnpm@11.1.2`.

## Setup And Daily Commands

```sh
pnpm install
cp .env.example .env
pnpm db:up
pnpm --filter @m199/db db:migrate:deploy
pnpm db:seed
```

Run the applications in separate terminals:

```sh
pnpm --filter @m199/api start:dev
pnpm --filter @m199/web dev
```

`pnpm dev` recursively runs only packages that define a `dev` script; currently
that is the web app, not the API. Vite proxies API routes to
`http://localhost:3000` by default. `API_TARGET` can override that target.

| Command                        | Purpose                                                                   |
| ------------------------------ | ------------------------------------------------------------------------- |
| `pnpm lint`                    | Lint the repository.                                                      |
| `pnpm format:check`            | Check Prettier formatting without writing files.                          |
| `pnpm typecheck`               | Type-check all three workspace packages.                                  |
| `pnpm test`                    | Run all package test suites once.                                         |
| `pnpm build`                   | Run available workspace build scripts; currently builds the web app.      |
| `pnpm --filter @m199/api test` | Run one package suite; replace the filter with `@m199/web` or `@m199/db`. |
| `pnpm db:status`               | Inspect the local database service.                                       |
| `pnpm db:down`                 | Stop services while preserving the database volume.                       |
| `pnpm db:reset`                | Destroy local database data and recreate PostgreSQL.                      |

## Architecture Boundaries

- Keep the dependency direction `web -> HTTP -> API -> database`.
- The web app must not import Prisma or access PostgreSQL. Keep authenticated web
  requests behind the existing admin API/session helpers.
- Put request validation in DTOs and domain behavior in API services. Preserve
  the global whitelist/transform validation pipe and exception filter.
- Route API persistence through `DbService`. `packages/db` owns client creation,
  schema, migrations, and seed behavior; do not construct another Prisma client.
- Keep environment validation before database initialization. The database
  package intentionally loads its client lazily after API configuration passes.
- Enforce durable invariants with Prisma/PostgreSQL constraints when supported;
  enforce cross-record and lifecycle rules transactionally in API services.
- Use explicit `.js` suffixes for relative ESM imports in TypeScript, matching
  the existing source.
- Keep public and admin controllers separate where the feature already follows
  that pattern. Protected mutations must preserve the existing auth and origin
  checks.

## Coding And Testing

- Follow strict TypeScript and existing feature-local structure rather than
  introducing a shared package before real cross-package duplication exists.
- Keep `*.test.ts` and `*.test.tsx` beside source. Name tests around observable
  behavior and cover success, validation, authorization, and failure paths.
- API tests use Vitest, Nest `Test.createTestingModule`, and explicit mocked
  providers. Unit tests should not require a live database.
- Web tests use Testing Library in jsdom. Assert user-visible state transitions
  and request behavior; restore mocked globals between tests.
- Preserve server-side rich-content sanitization and client-side DOMPurify
  handling when changing post rendering or editing flows.
- Add or update the narrowest relevant test with behavior changes. Do not weaken
  assertions merely to make an implementation pass.

## Prisma, Migrations, And Seeds

- `packages/db/prisma.config.ts` loads `DATABASE_URL` from the root `.env`.
- Change `schema.prisma`, create a new migration with
  `pnpm --filter @m199/db db:migrate:dev`, and commit both schema and migration.
  Do not rewrite migration history that may already be applied.
- Prefer data-preserving SQL for renames or required-column changes. Add focused
  migration safety coverage when a change can destroy or reinterpret data.
- Run `pnpm --filter @m199/db db:validate` and
  `pnpm --filter @m199/db db:generate` after schema changes, then type-check API
  consumers.
- Use `db:migrate:deploy` to apply existing migrations; it does not create them.
- The current seed creates landing settings ID `1` or fills only null fields. It
  preserves existing non-null admin values. Keep seeds repeatable and
  non-destructive unless a task explicitly defines otherwise.

## Secrets, Generated Files, And Uploads

- Never commit `.env` or credentials. Keep `.env.example` limited to documented
  placeholders. `VITE_*` values are public browser configuration, not secrets.
- Required API variables are `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`,
  and `VISITOR_HASH_SECRET`; `API_ORIGIN`, `UPLOAD_DIR`, and `MAX_FILE_SIZE` have
  validated defaults.
- Local uploads default to `uploads/`, which is ignored. Do not commit uploads or
  bypass `FileService`: it owns size, category, MIME/signature, path-containment,
  thumbnail, metadata, rollback, and deletion behavior.
- Do not edit or commit dependency-generated Prisma clients, build output,
  coverage, logs, or local tooling metadata. Regenerate them through scripts.

## Scope And Verification

- Keep unrelated cleanup, dependency upgrades, lockfile churn, and generated
  output outside the change. Preserve unrelated worktree changes.
- Update both sides of an API payload deliberately; avoid silently duplicating
  incompatible contract types or business rules in the web app.
- Run package-local tests and type checks while iterating. Before handoff, run
  `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, and `pnpm test` for changes
  that cross packages. Run `pnpm build` for web or integration-facing changes.
- For database changes, also run DB validation/generation and relevant migration
  tests. State clearly when PostgreSQL-dependent verification was not run.
- Finish with `git diff --check`, inspect the complete diff, and confirm no
  secrets, uploads, generated files, or out-of-scope files were added.
