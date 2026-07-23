/// <reference types="astro/client" />

// ---------------------------------------------------------------------------
// Astro server-side env typing (PR1 Foundation).
//
// The landing payload fetch (PR2) and the SSR render (PR3) read these
// variables via `import.meta.env` from server-only modules. They are
// declared here so the TypeScript surface is consistent with the runtime
// env contract enforced in apps/web/src/lib/server/env.ts.
//
// Why these names MUST NOT start with `PUBLIC_`:
//   Astro only inlines env variables whose name starts with `PUBLIC_` into
//   the client bundle. `ASTRO_API_BASE_URL` and `ASTRO_PORT` are server-side
//   only: `ASTRO_API_BASE_URL` is the trusted upstream of the landing
//   payload fetch (revealing it would leak the API origin), and
//   `ASTRO_PORT` controls the listen port of the Astro Node adapter
//   (which is never visible to clients). If a future change accidentally
//   renames either with a `PUBLIC_` prefix, Astro would inline the value
//   into the client bundle — the unit tests in env.test.ts do not cover
//   that path, so the prefix is enforced by review and by this comment.
// ---------------------------------------------------------------------------
interface ImportMetaEnv {
  readonly ASTRO_API_BASE_URL: string;
  readonly ASTRO_PORT?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
