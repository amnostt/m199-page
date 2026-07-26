// ---------------------------------------------------------------------------
// Admin session helpers.
//
// The browser owns only logical caller coordination. Durable refresh-family
// state, operation idempotency, stale-cookie convergence, and terminal logout
// are API responsibilities. A caller settles after 15 seconds; a late fetch
// completion is deliberately side-effect free and cannot authorize logout.
// ---------------------------------------------------------------------------

import type { AuthUser } from "./adminTypes.js";

export class AdminRequestError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly body: string;

  constructor(status: number, statusText: string, body: string) {
    super(body || statusText || "Admin request failed");
    this.name = "AdminRequestError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

async function parseErrorBody(res: Response): Promise<string> {
  let contentType = "";
  try {
    contentType = (res.headers?.get("content-type") ?? "").toLowerCase();
  } catch {
    contentType = "";
  }
  if (!contentType) return res.statusText || "Admin request failed";

  try {
    if (contentType.includes("application/json")) {
      const data = (await res.json()) as Record<string, unknown> | null;
      if (data && typeof data === "object") {
        const message = data["message"];
        if (typeof message === "string" && message.length > 0) return message;
        if (Array.isArray(message) && message.length > 0) {
          return message
            .filter((item): item is string => typeof item === "string")
            .join("; ");
        }
        const error = data["error"];
        if (typeof error === "string" && error.length > 0) return error;
      }
    } else {
      const text = await res.text();
      if (text && text.length > 0) return text;
    }
  } catch {
    // Fall through to statusText for malformed or unavailable bodies.
  }
  return res.statusText || "Admin request failed";
}

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const res = await fetch("/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) throw new Error("Login failed");
  return res.json() as Promise<AuthUser>;
}

export const REFRESH_DEADLINE_MS = 15_000;
const REFRESH_OPERATION_HEADER = "X-Refresh-Operation-Id";
const AUTH_MIN_EPOCH_HEADER = "X-Auth-Min-Epoch";
const REFRESH_FAMILY_VERSION_HEADER = "x-refresh-family-version";

type RefreshFailureKind = "timeout" | "terminal" | "network" | "stale";

class RefreshFailureError extends Error {
  public readonly cycleId: symbol;
  public readonly generation: number;
  public readonly kind: RefreshFailureKind;
  public readonly status?: number;

  constructor(
    message: string,
    cycleId: symbol,
    generation: number,
    kind: RefreshFailureKind,
    status?: number,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "RefreshFailureError";
    this.cycleId = cycleId;
    this.generation = generation;
    this.kind = kind;
    this.status = status;
  }
}

type RefreshTransport = {
  id: symbol;
  operationId: string;
  promise: Promise<AuthUser>;
  controller?: AbortController;
  settled: boolean;
  generation: number;
};

type RefreshCycle = {
  id: symbol;
  generation: number;
  operationId: string;
  promise: Promise<AuthUser>;
  resolve: (user: AuthUser) => void;
  reject: (error: unknown) => void;
  timeoutId: ReturnType<typeof setTimeout>;
  settled: boolean;
  transport?: RefreshTransport;
};

let activeCycle: RefreshCycle | null = null;
let refreshGeneration = 0;
let acceptedFamilyVersion = 0;
let sessionGeneration = 0;
let recoveryOperationId: string | null = null;

function createOperationId(): string {
  const candidate = globalThis.crypto?.randomUUID?.();
  if (candidate) return candidate;
  // All supported browsers expose crypto.randomUUID. This fallback keeps unit
  // tests and older embedders deterministic while remaining a UUID shape.
  const suffix = (Date.now() + refreshGeneration)
    .toString(16)
    .padStart(12, "0");
  return `00000000-0000-4000-8000-${suffix.slice(-12)}`;
}

function parseFamilyVersion(res: Response): number | undefined {
  const raw = res.headers?.get(REFRESH_FAMILY_VERSION_HEADER);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function createRefreshFailure(
  cycle: RefreshCycle,
  error: unknown,
  kind: RefreshFailureKind = "network",
  status?: number,
): RefreshFailureError {
  const message =
    error instanceof Error ? error.message : "Session refresh failed";
  return new RefreshFailureError(
    message,
    cycle.id,
    cycle.generation,
    kind,
    status,
    error,
  );
}

async function performRefresh(
  operationId: string,
  generation: number,
  signal?: AbortSignal,
): Promise<AuthUser> {
  const headers: Record<string, string> = {
    [REFRESH_OPERATION_HEADER]: operationId,
    [AUTH_MIN_EPOCH_HEADER]: String(acceptedFamilyVersion),
  };
  const res = await fetch("/auth/refresh", {
    method: "POST",
    credentials: "include",
    headers,
    ...(signal ? { signal } : {}),
  });

  if (!res.ok) {
    const body = await parseErrorBody(res);
    const kind: RefreshFailureKind =
      res.status === 401 || res.status === 409 ? "terminal" : "network";
    throw new RefreshFailureError(
      res.status === 401 || res.status === 409
        ? "Session refresh failed"
        : body || "Session refresh failed",
      Symbol("refresh-response"),
      generation,
      kind,
      res.status,
    );
  }

  if (generation !== sessionGeneration) {
    throw new RefreshFailureError(
      "Refresh completed after session logout",
      Symbol("refresh-after-logout"),
      generation,
      "stale",
      res.status,
    );
  }

  const version = parseFamilyVersion(res);
  if (version !== undefined) {
    if (version < acceptedFamilyVersion) {
      throw new RefreshFailureError(
        "Stale refresh response",
        Symbol("refresh-stale-response"),
        generation,
        "stale",
        res.status,
      );
    }
    acceptedFamilyVersion = version;
  }
  return res.json() as Promise<AuthUser>;
}

function settleCycle(
  cycle: RefreshCycle,
  result: { user: AuthUser } | { error: unknown },
): void {
  if (cycle.settled) return;
  cycle.settled = true;
  clearTimeout(cycle.timeoutId);
  if (activeCycle === cycle) activeCycle = null;
  if ("user" in result) cycle.resolve(result.user);
  else cycle.reject(result.error);
}

function expireCycle(cycle: RefreshCycle): void {
  if (cycle.settled) return;
  recoveryOperationId = cycle.operationId;
  settleCycle(cycle, {
    error: createRefreshFailure(
      cycle,
      new Error("Session refresh timed out"),
      "timeout",
    ),
  });
  // Abort is advisory. The API family transaction is the authority if the
  // request has already reached the server, so recovery may safely proceed.
  cycle.transport?.controller?.abort();
}

function createCycle(): RefreshCycle {
  let resolve!: (user: AuthUser) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<AuthUser>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  const cycle = {
    id: Symbol("refresh-cycle"),
    generation: ++refreshGeneration,
    operationId: recoveryOperationId ?? createOperationId(),
    promise,
    resolve,
    reject,
    timeoutId: undefined as unknown as ReturnType<typeof setTimeout>,
    settled: false,
  } satisfies Omit<RefreshCycle, "timeoutId"> & {
    timeoutId: ReturnType<typeof setTimeout>;
  };
  cycle.timeoutId = setTimeout(() => expireCycle(cycle), REFRESH_DEADLINE_MS);
  return cycle;
}

function handleTransportResult(
  transport: RefreshTransport,
  cycle: RefreshCycle,
  result: { user: AuthUser } | { error: unknown },
): void {
  if (transport.settled) return;
  transport.settled = true;
  if (cycle.transport !== transport) return;
  const isCurrentSession = transport.generation === sessionGeneration;
  if ("user" in result) {
    if (isCurrentSession) recoveryOperationId = null;
    settleCycle(cycle, result);
  } else {
    if (
      isCurrentSession &&
      result.error instanceof RefreshFailureError &&
      (result.error.kind === "terminal" || result.error.kind === "stale")
    ) {
      recoveryOperationId = null;
    }
    if (!cycle.settled) {
      settleCycle(cycle, {
        error:
          result.error instanceof RefreshFailureError
            ? result.error
            : createRefreshFailure(cycle, result.error),
      });
    }
  }
}

function startTransport(cycle: RefreshCycle): void {
  const controller =
    typeof AbortController === "undefined" ? undefined : new AbortController();
  const transport: RefreshTransport = {
    id: Symbol("refresh-transport"),
    operationId: cycle.operationId,
    promise: Promise.resolve(undefined as never),
    ...(controller ? { controller } : {}),
    settled: false,
    generation: sessionGeneration,
  };
  cycle.transport = transport;
  transport.promise = performRefresh(
    transport.operationId,
    transport.generation,
    controller?.signal,
  );
  void transport.promise.then(
    (user) => handleTransportResult(transport, cycle, { user }),
    (error: unknown) =>
      handleTransportResult(transport, cycle, {
        error:
          error instanceof RefreshFailureError
            ? error
            : createRefreshFailure(cycle, error),
      }),
  );
}

export async function refreshSession(): Promise<AuthUser> {
  if (activeCycle && !activeCycle.settled) return activeCycle.promise;
  const cycle = createCycle();
  activeCycle = cycle;
  startTransport(cycle);
  return cycle.promise;
}

export async function logout(): Promise<void> {
  sessionGeneration++;
  activeCycle = null;
  acceptedFamilyVersion = 0;
  recoveryOperationId = null;
  const res = await fetch("/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Logout failed");
}

function isRefreshFailure(error: unknown): error is RefreshFailureError {
  return error instanceof RefreshFailureError;
}

async function recoverAfterRefreshFailure(error: unknown): Promise<void> {
  if (isRefreshFailure(error) && error.kind === "timeout") {
    // The first server operation is bounded independently. A new logical
    // cycle is a recovery request, not permission to perform client-side
    // rotation; the API family lock/replay contract decides the outcome.
    await refreshSession();
    return;
  }
  if (isRefreshFailure(error) && error.kind === "terminal") {
    await logout().catch(() => {
      /* best-effort terminal cleanup */
    });
    window.location.href = "/admin";
    throw new Error("Session expired");
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Protected fetch: one refresh/retry on 401, terminal 403 logout/redirect.
// ---------------------------------------------------------------------------

export async function adminFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });

  if (res.status === 401) {
    try {
      await refreshSession();
    } catch (error) {
      try {
        await recoverAfterRefreshFailure(error);
      } catch (recoveryError) {
        if (
          isRefreshFailure(recoveryError) &&
          recoveryError.kind === "timeout"
        ) {
          throw new Error("Session expired");
        }
        throw new Error("Session expired", { cause: recoveryError });
      }
    }

    const retryRes = await fetch(url, { ...init, credentials: "include" });
    if (!retryRes.ok) {
      const body = await parseErrorBody(retryRes);
      throw new AdminRequestError(retryRes.status, retryRes.statusText, body);
    }
    if (retryRes.status === 204) return undefined as T;
    return retryRes.json() as Promise<T>;
  }

  if (res.status === 403) {
    await logout().catch(() => {
      /* best-effort */
    });
    window.location.href = "/admin";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const body = await parseErrorBody(res);
    throw new AdminRequestError(res.status, res.statusText, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
