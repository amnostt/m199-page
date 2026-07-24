/// <reference types="astro/client" />

// ---------------------------------------------------------------------------
// Astro module typing (PR3 root rendering).
//
// The `astro/client` types do not declare a module shape for `.astro`
// imports; the project imports `Landing.astro` from a Vitest test, and
// the page wrapper imports its own `index.astro` components. Declare
// the module so `tsc --noEmit` accepts the import statement. The
// runtime shape is provided by Astro at build time;
// this declaration is only for typecheck ergonomics.
// ---------------------------------------------------------------------------
declare module "*.astro" {
  // The default export is an Astro component factory. The
  // Container API and the page wrapper consume the same shape at
  // runtime, so we declare it as `AstroComponentFactory` for
  // typecheck.
  import type { AstroComponentFactory } from "astro";
  const component: AstroComponentFactory;
  export default component;
}

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
