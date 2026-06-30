# Design: Database Operational Foundation

## Technical Approach

Single-package ownership: `@m199/db` owns the Prisma schema, config, migration history, and Prisma Client singleton. `apps/api` consumes the client exclusively through `@m199/db`'s public exports — never importing `@prisma/client` directly. The package exposes its entrypoint via an `exports` field in `package.json` pointing to `./src/index.ts`, enabling `moduleResolution: "Bundler"` resolution from consuming workspaces without a build step.

Three layers: (1) add `migrations` path and `exports` entrypoint to `packages/db`, (2) add operational scripts to `packages/db/package.json`, and (3) a type-level consumption smoke test in `apps/api`.

No seed is included. The schema's 12-model relational complexity makes even "minimal" seed substantial (~100+ lines with FK constraints). The type-level smoke test proves wiring. Seed belongs in a later change.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `@m199/db` owns and exports PrismaClient singleton; `apps/api` imports from `@m199/db` | Slightly more indirection than direct `@prisma/client` import in `apps/api` | **Chosen** — centralizes ownership, matches proposal intent |
| `apps/api` depends on `@prisma/client` directly | Simpler upfront, no re-export | **Rejected** — scatters database access, violates `@m199/db` boundary |
| `exports` pointing to `./src/index.ts` (source, no build) | Requires TypeScript-aware consumer; Node.js direct require fails | **Chosen** — workspace uses `moduleResolution: "Bundler"` with `noEmit`; typecheck boundary is the only consumer in this change |
| `exports` pointing to compiled `./dist/index.js` | Viable for Node.js runtime but needs build step | **Rejected** — adds complexity; runtime consumption is out of scope |
| Env contract: `.env.example` only | Simpler; one surface to maintain | **Rejected** — proposal requires both tool-consumed contract AND human-readable documentation |
| Env contract: `.env.example` + `docs/technical-foundation.md` | Two surfaces to keep in sync | **Chosen** — `.env.example` stays the tool-consumed `DATABASE_URL` contract (Prisma 7 env loading reads it directly); `docs/technical-foundation.md` gains a "Database Operational Foundation" section with PostgreSQL 16+ prerequisite, env setup instructions, migration commands, and client generation workflow. Contributors read the docs; tools read the env file. |

## Data Flow

```
.env (DATABASE_URL)
      │
      ▼
prisma.config.ts ──dotenv──► load env vars
      │
      ├─ schema: schema.prisma
      ├─ migrations: { path: 'prisma/migrations' }
      └─ datasource: { url: env('DATABASE_URL') }
              │
     ┌────────┼─────────┐
     ▼        ▼         ▼
  validate  migrate   generate
              │         │
              ▼         ▼
       prisma/      node_modules/
       migrations/  @prisma/client
                        │
                        ▼
              packages/db/package.json
              "exports": { ".": "./src/index.ts" }
                        │
                        ▼
              packages/db/src/index.ts
              (export prisma singleton)
                        │
                        ▼
              apps/api/src/index.ts
              (import type boundary: void prisma)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/db/package.json` | Modify | Add `@prisma/client` dep; add scripts; add `"exports": { ".": "./src/index.ts" }` so `@m199/db` resolves via `moduleResolution: "Bundler"` |
| `packages/db/prisma.config.ts` | Modify | Add `migrations: { path: 'prisma/migrations' }` |
| `packages/db/src/index.ts` | Modify | Instantiate and export `prisma` singleton from `@prisma/client` |
| `packages/db/src/index.test.ts` | Modify | Add smoke test asserting `prisma` export exists |
| `apps/api/package.json` | Modify | Add `@m199/db: workspace:*` dependency |
| `apps/api/src/index.ts` | Modify | Add `import { prisma } from '@m199/db'` with `void prisma` type-boundary proof |
| `.env.example` | Modify | Document PostgreSQL 16+ prerequisite and `DATABASE_URL` contract (tool-consumed env surface) |
| `docs/technical-foundation.md` | Modify | Add "Database Operational Foundation" section: PostgreSQL 16+ prerequisite, `DATABASE_URL` config via `.env.example`, `pnpm` migration/generate commands, `@m199/db` package boundary. Update MVP Exclusions to reflect migrations/config/client are now operational scaffolding. |
| `packages/db/prisma/migrations/` | New | First migration SQL from hardened schema; committed per Prisma convention |

## Interfaces / Contracts

```ts
// packages/db/src/index.ts — public export surface
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
export const DB_PACKAGE_VERSION = "0.0.0" as const;
```

```jsonc
// packages/db/package.json — relevant additions
{
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@prisma/client": "^7.5.0",
    "dotenv": "^17.2.0",
    "prisma": "^7.5.0"
  },
  "scripts": {
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:generate": "prisma generate",
    "db:validate": "prisma validate",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

```ts
// apps/api/src/index.ts — consumption boundary proof
import { prisma } from "@m199/db";

export const API_PACKAGE_VERSION = "0.0.0" as const;
void prisma;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `prisma` singleton export | New vitest assertion in `packages/db/src/index.test.ts` |
| Integration | Migration creates valid SQL | Manual `prisma migrate dev` verification |
| Type | `apps/api` compiles with `@m199/db` import | `pnpm --filter @m199/api typecheck` |

## Migration / Rollout

No migration of existing data — greenfield operational foundation for local/dev. Rollback: revert `packages/db` config/script/client/export changes, remove `prisma/migrations/`, remove `@m199/db` dep from `apps/api`, undo import, restore `.env.example`, revert `docs/technical-foundation.md` to pre-change state. `pnpm install`. No production impact.

## Verification Commands

```sh
pnpm --filter @m199/db db:validate    # Schema valid
pnpm --filter @m199/db db:generate     # Client generates (needs DATABASE_URL)
pnpm --filter @m199/api typecheck      # API boundary compiles
pnpm test                              # All existing tests pass
```

## Open Questions

- [ ] Should `vitest.config.ts` in `packages/db` gain a `setupFiles` for dotenv so future DB integration tests can resolve `DATABASE_URL` without manual env setup?
