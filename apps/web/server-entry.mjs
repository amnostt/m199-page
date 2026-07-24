// ---------------------------------------------------------------------------
// server-entry.mjs — production entry point for the Astro Node adapter
// standalone server.
//
// The Astro Node adapter's standalone entry reads the `PORT` environment
// variable at request-handler initialization time. The documented contract
// for this project is `ASTRO_PORT`. This file bridges the two by calling
// `bridgeAstroPortToRuntime()` (in server-port.mjs) BEFORE the built
// server entry is dynamically imported. The unit tests for that bridge
// live in server-port.test.mjs.
//
// This bridge is the single line that closes review blocker A-004
// ("documented ASTRO_PORT is not bridged to the standalone Node runtime
// PORT") without changing the Astro adapter's contract.
//
// Usage:
//   node ./apps/web/server-entry.mjs
//   # or
//   pnpm --filter @m199/web start
// ---------------------------------------------------------------------------
import { loadRootEnv } from "./server-env.mjs";
import { bridgeAstroPortToRuntime } from "./server-port.mjs";

loadRootEnv();
bridgeAstroPortToRuntime();

// Dynamic import so the resolved PORT is in `process.env` before the built
// server entry evaluates. The built entry lives at ./dist/server/entry.mjs
// and is produced by `astro build` with the @astrojs/node standalone adapter.
await import("./dist/server/entry.mjs");
