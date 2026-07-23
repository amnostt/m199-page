// @vitest-environment node
//
// PR4 SSR proof (tasks 4.1 + 4.2) — mandatory built-server SSR testing.
//
// Boots the real Astro standalone server (production entry: `node
// server-entry.mjs`) as a child process and a small in-process stub API,
// then exercises the live HTTP surface:
//
//   1. `GET /` returns 200 with server-rendered landing HTML when the
//      stub returns a valid payload.
//   2. `GET /` returns 503 with the controlled failure markup when the
//      stub returns a non-2xx response.
//   3. `GET /_astro/*.css` returns 200 with the right content-type.
//
// The build is acquired explicitly: every run removes `dist/`, runs
// `astro build` synchronously, and fails if the expected output is not
// produced. The test never silently skips. Ports are allocated via the OS
// (`listen(0)`), and the brief close-to-bind race for the child is mitigated
// by bounded, readiness-driven startup retries. All child processes and
// servers are closed in `afterAll` and on early termination.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(HERE, "..", "..", "..");
const WORKSPACE_ROOT = resolve(WEB_ROOT, "..");
const DIST_ROOT = resolve(WEB_ROOT, "dist");
const DIST_SERVER_ENTRY = resolve(WEB_ROOT, "dist", "server", "entry.mjs");
const SERVER_ENTRY = resolve(WEB_ROOT, "server-entry.mjs");
const UPSTREAM_FAILURE = {
  status: 500,
  body: "simulated upstream failure",
  reason: "http_error",
};

// ---------------------------------------------------------------------------
// Port allocation
// ---------------------------------------------------------------------------

/**
 * Ask the kernel for a free TCP port on the loopback interface, then release
 * it. A caller must still tolerate a close-to-bind race; startAstroServer()
 * does so with bounded readiness-driven retries.
 */
async function allocateFreePort() {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Failed to allocate a free TCP port"));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

// ---------------------------------------------------------------------------
// HTTP readiness
// ---------------------------------------------------------------------------

/**
 * Poll an HTTP endpoint until it answers (any status counts as ready)
 * or the timeout elapses. Uses exponential backoff with a 25ms floor
 * so we never burn the event loop on a fixed sleep.
 */
async function waitForHttp(url, { timeoutMs = 20_000, terminalError } = {}) {
  const deadline = Date.now() + timeoutMs;
  let delay = 25;
  let lastError;
  while (Date.now() < deadline) {
    const terminal = terminalError?.();
    if (terminal) throw terminal;
    try {
      const response = await fetch(url);
      await response.arrayBuffer();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 250);
    }
  }
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for ${String(url)}: ${String(lastError)}`,
  );
}

// ---------------------------------------------------------------------------
// Stub API
// ---------------------------------------------------------------------------

function buildSuccessPayload() {
  return {
    heroTitle: "PR4 SSR proof — hero title",
    heroSubtitle: "PR4 SSR proof — hero subtitle",
    heroImageUrl: "https://cdn.example.test/hero.jpg",
    mission: "PR4 SSR proof — mission text",
    vision: null,
    description: null,
    featuredVideoUrl: null,
    contactEmail: "contact@pr4.test",
    contactPhone: null,
    featuredOuting: {
      id: "out-1",
      slug: "out-1",
      title: "PR4 SSR proof — featured outing",
      location: "PR4 SSR proof — Buenos Aires",
      mainImageUrl: null,
    },
    featuredPosts: [
      {
        id: "post-1",
        slug: "post-1",
        title: "PR4 SSR proof — featured post",
        coverImageUrl: null,
      },
    ],
    currentVerse: {
      text: "PR4 SSR proof — verse text",
      reference: "PR4 1:1",
      date: "2026-07-23",
    },
  };
}

/**
 * A minimal in-process stub API that serves `GET /landing/public` in
 * three deterministic modes: success, controlled-failure, or
 * invalid-payload. The current mode is a single mutable string so the
 * test can switch it between cases without recreating the server.
 */
function createStubApi({ port, mode }) {
  const handler = (req, res) => {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET");
      res.end();
      return;
    }
    if (req.url !== "/landing/public") {
      res.statusCode = 404;
      res.end();
      return;
    }
    mode.requests.push({ method: req.method, url: req.url });
    if (mode.value === "success") {
      const body = JSON.stringify(buildSuccessPayload());
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(body);
      return;
    }
    if (mode.value === "http_error") {
      res.statusCode = UPSTREAM_FAILURE.status;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end(UPSTREAM_FAILURE.body);
      return;
    }
    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end("{not-json");
  };
  return new Promise((resolve, reject) => {
    const server = createHttpServer(handler);
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Stub API did not receive a TCP port"));
        return;
      }
      resolve({ server, port: address.port, mode });
    });
  });
}

// ---------------------------------------------------------------------------
// Build acquisition
// ---------------------------------------------------------------------------

/**
 * Remove any previous output and build the SSR artifact from the current
 * source. Reusing `dist/` could prove a stale server instead of this change.
 */
function buildFreshOutput() {
  rmSync(DIST_ROOT, { recursive: true, force: true });
  const result = spawnSync(
    "pnpm",
    ["--filter", "@m199/web", "exec", "astro", "build"],
    {
      cwd: WORKSPACE_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "production" },
      timeout: 180_000,
    },
  );
  if (result.error) {
    throw new Error(
      `Failed to run astro build: ${String(result.error)}; SSR proof requires ${DIST_SERVER_ENTRY}.`,
    );
  }
  if (result.status !== 0) {
    const log = (result.stderr || result.stdout || "").trim();
    throw new Error(
      `astro build exited with status ${String(result.status)}; SSR proof requires ${DIST_SERVER_ENTRY}.\n${log}`,
    );
  }
  if (!existsSync(DIST_SERVER_ENTRY)) {
    throw new Error(
      `astro build completed but ${DIST_SERVER_ENTRY} is still missing`,
    );
  }
}

// ---------------------------------------------------------------------------
// Process management
// ---------------------------------------------------------------------------

const harness = {};

function killChild(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    const force = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // best-effort
      }
      resolve();
    }, 2_000);
    child.once("exit", () => {
      clearTimeout(force);
      resolve();
    });
    try {
      child.kill("SIGTERM");
    } catch {
      clearTimeout(force);
      resolve();
    }
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error?.code === "ERR_SERVER_NOT_RUNNING") {
        resolve();
        return;
      }
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function cleanupHarness() {
  const child = harness.astro?.child;
  const apiServer = harness.api?.server;
  harness.astro = undefined;
  harness.api = undefined;
  harness.baseUrl = undefined;
  await Promise.all([
    child ? killChild(child) : undefined,
    apiServer ? closeServer(apiServer) : undefined,
  ]);
}

function spawnAstroServer({ apiPort, onSpawn }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SERVER_ENTRY], {
      cwd: WEB_ROOT,
      env: {
        ...process.env,
        PORT: String(apiPort.astroPort),
        ASTRO_PORT: String(apiPort.astroPort),
        HOST: "127.0.0.1",
        ASTRO_API_BASE_URL: `http://127.0.0.1:${String(apiPort.apiPort)}`,
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", (chunk) =>
      process.stdout.write(`[astro] ${chunk}`),
    );
    child.stderr?.on("data", (chunk) =>
      process.stderr.write(`[astro] ${chunk}`),
    );
    child.once("error", reject);
    onSpawn(child);
    resolve(child);
  });
}

async function startAstroServer({ apiPort, onSpawn }) {
  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const astroPort = await allocateFreePort();
    const baseUrl = `http://127.0.0.1:${String(astroPort)}`;
    let childExited = false;
    let exitDetail = "";
    const child = await spawnAstroServer({
      apiPort: { apiPort, astroPort },
      onSpawn,
    });
    child.on("exit", (code, signal) => {
      childExited = true;
      exitDetail = `code=${String(code)} signal=${String(signal)}`;
    });

    try {
      await waitForHttp(baseUrl, {
        terminalError: () =>
          childExited
            ? new Error(
                `Astro server exited during startup (${exitDetail}); SSR proof cannot continue.`,
              )
            : undefined,
      });
      return { child, baseUrl };
    } catch (error) {
      await killChild(child);
      onSpawn(undefined);
      lastError = error;
    }
  }

  throw new Error(
    `Astro server did not become ready after ${String(maxAttempts)} dynamically allocated ports: ${String(lastError)}`,
  );
}

// `beforeAll` cannot be async-aware of process-level failures, so we
// collect any error here and rethrow it inside the first `it` block —
// vitest's standard way to fail-fast on suite-wide setup errors.
let setupError = null;

// Best-effort cleanup if the test process is killed before `afterAll`
// runs. Without this, a SIGINT/SIGTERM mid-test would orphan the
// Astro child and bind the ephemeral port until the OS reaps it.
const emergencyCleanup = () => {
  if (harness.astro?.child && harness.astro.child.exitCode === null) {
    try {
      harness.astro.child.kill("SIGTERM");
    } catch {
      // best-effort
    }
  }
  const apiServer = harness.api?.server;
  if (apiServer) {
    try {
      apiServer.close();
    } catch {
      // best-effort
    }
  }
};
process.once("exit", emergencyCleanup);
process.once("SIGINT", () => {
  emergencyCleanup();
  process.exit(130);
});
process.once("SIGTERM", () => {
  emergencyCleanup();
  process.exit(143);
});

beforeAll(async () => {
  try {
    buildFreshOutput();
    const mode = { value: "success", requests: [] };
    const api = await createStubApi({ port: 0, mode });
    harness.api = api;
    const astro = await startAstroServer({
      apiPort: api.port,
      onSpawn: (child) => {
        harness.astro = child ? { child } : undefined;
      },
    });
    harness.astro = astro;
    harness.baseUrl = astro.baseUrl;
  } catch (error) {
    await cleanupHarness();
    setupError =
      error instanceof Error
        ? error
        : new Error(`SSR proof setup failed: ${String(error)}`);
  }
}, 240_000);

afterAll(async () => {
  await cleanupHarness();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PR4 SSR proof — built Astro standalone server", () => {
  it("boots and serves a 200 landing when the stub API returns a valid payload", async () => {
    if (setupError) throw setupError;
    const baseUrl = harness.baseUrl;
    const api = harness.api;
    api.mode.value = "success";
    api.mode.requests = [];
    const response = await fetch(baseUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type") ?? "").toMatch(/text\/html/);
    const body = await response.text();
    // Document shell and visual boundary (P3-005 contract).
    expect(body).toMatch(/<html\s+lang=["']es["']>/);
    expect(body).toMatch(/<meta\s+charset=["']utf-8["']/);
    expect(body).toMatch(/<title>Misión 1-99<\/title>/);
    expect(body).toContain('class="public-ui public-page"');
    expect(body).toContain('data-testid="landing-page"');
    // Server-rendered payload — content from the stub is in the body.
    expect(body).toContain("PR4 SSR proof — featured outing");
    expect(body).toContain("PR4 SSR proof — Buenos Aires");
    expect(body).toContain("PR4 SSR proof — featured post");
    expect(body).toContain("PR4 SSR proof — verse text");
    expect(body).toContain("PR4 SSR proof — mission text");
    // The page references a `/_astro/*` CSS file. The exact hash is
    // build-dependent, but the stub path is not.
    expect(body).toMatch(/href=["']?\/_astro\/[^"']+\.css["']?/);
    expect(api.mode.requests).toEqual([
      { method: "GET", url: "/landing/public" },
    ]);
  });

  it("returns a controlled 503 with generic failure markup when the stub API fails", async () => {
    if (setupError) throw setupError;
    const baseUrl = harness.baseUrl;
    const api = harness.api;
    api.mode.value = "http_error";
    api.mode.requests = [];
    const response = await fetch(baseUrl);
    expect(response.status).toBe(503);
    expect(response.statusText.toLowerCase()).toContain("service unavailable");
    expect(response.headers.get("content-type") ?? "").toMatch(/text\/html/);
    const body = await response.text();
    // Document shell still emits.
    expect(body).toMatch(/<html\s+lang=["']es["']>/);
    expect(body).toMatch(/<title>Misión 1-99<\/title>/);
    // Generic failure markup is rendered; no classified reason leaks.
    expect(body).toContain('data-testid="landing-error"');
    expect(body).toContain(
      "La página no se puede cargar en este momento. Intentá nuevamente en unos minutos.",
    );
    const lower = body.toLowerCase();
    for (const leak of [
      `127.0.0.1:${String(api.port)}`,
      String(UPSTREAM_FAILURE.status),
      UPSTREAM_FAILURE.body,
      UPSTREAM_FAILURE.reason,
    ]) {
      expect(lower).not.toContain(leak.toLowerCase());
    }
    for (const leak of [
      "timeout",
      "network_error",
      "http_error",
      "invalid_payload",
      "fetch_error",
      "landingfetcherror",
      "stack",
      "cause",
      "prisma",
    ]) {
      expect(lower).not.toContain(leak);
    }
    // The page must not echo the success content either.
    expect(body).not.toContain("PR4 SSR proof — featured outing");
    expect(api.mode.requests).toEqual([
      { method: "GET", url: "/landing/public" },
    ]);
  });

  it("returns the same generic 503 when the stub API returns an invalid payload", async () => {
    if (setupError) throw setupError;
    const baseUrl = harness.baseUrl;
    const api = harness.api;
    api.mode.value = "invalid_payload";
    api.mode.requests = [];
    const response = await fetch(baseUrl);
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type") ?? "").toMatch(/text\/html/);
    const body = await response.text();
    expect(body).toContain('data-testid="landing-error"');
    expect(body).toContain(
      "La página no se puede cargar en este momento. Intentá nuevamente en unos minutos.",
    );
    expect(body.toLowerCase()).not.toContain("invalid_payload");
    expect(body).not.toContain("{not-json");
    expect(api.mode.requests).toEqual([
      { method: "GET", url: "/landing/public" },
    ]);
  });

  it("serves the CSS asset linked by actual SSR HTML with the documented content-type", async () => {
    if (setupError) throw setupError;
    const baseUrl = harness.baseUrl;
    const api = harness.api;
    api.mode.value = "success";
    api.mode.requests = [];
    const landingResponse = await fetch(baseUrl);
    expect(landingResponse.status).toBe(200);
    const landingHtml = await landingResponse.text();
    const cssMatch = landingHtml.match(
      /<link\b[^>]*\bhref=["'](\/_astro\/[^"']+\.css)["'][^>]*>/i,
    );
    if (!cssMatch?.[1]) {
      throw new Error(
        "SSR HTML did not link a /_astro/*.css asset; static asset proof cannot continue.",
      );
    }
    const response = await fetch(new URL(cssMatch[1], baseUrl));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type") ?? "").toMatch(/text\/css/);
    const body = await response.text();
    expect(body.length).toBeGreaterThan(0);
    expect(api.mode.requests).toEqual([
      { method: "GET", url: "/landing/public" },
    ]);
  });
});
