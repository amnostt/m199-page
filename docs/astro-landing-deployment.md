# Astro landing operations guide

This guide defines the planned Node + Caddy handoff for the Astro-rendered
landing route. It is documentation and review evidence only: it does not
apply a VPS change, execute Caddy, or choose real production upstream names.
Replace the placeholders and validate the complete topology with the operator
before deployment.

## Quick path

1. Build the Astro web artifact from the repository root:

   ```sh
   pnpm --filter @m199/web build
   ```

2. Start the Astro standalone process with `ASTRO_API_BASE_URL` and an
   explicit private `PORT` that differs from Nest (for example,
   `PORT=4321 ASTRO_PORT=4321`). The repository loads root `.env`, whose
   `PORT=3000` takes precedence over `ASTRO_PORT`; `ASTRO_PORT` alone is not
   sufficient and would collide with Nest. The entry point bridges
   `ASTRO_PORT` to the Astro adapter's `PORT` only when `PORT` is unset.
3. Keep the Nest API on its private upstream; Astro owns the web documents and
   emitted assets.
4. Apply the ordered Caddy route contract below only after substituting and
   reviewing the upstream names.
5. Verify `/`, one emitted `/_astro/*` asset, the interactive public documents,
   `/admin`, the API variants, and `/health`. The verification matrix is intentionally
   local/static; this change does not execute Caddy or contact a VPS.

## Runtime mapping

| Runtime | Build artifact | Start contract | Owns |
| --- | --- | --- | --- |
| Astro Node | `apps/web/dist/server` and `apps/web/dist/client` | `pnpm --filter @m199/web start` (`node ./server-entry.mjs`) | All web documents, React admin/public islands, and `/_astro/*` |
| Nest API | `apps/api` build/runtime outside this slice | Existing API process on a private upstream | API paths and `/health` |

The web build runs `astro check && astro build` and writes the standalone Astro
output to `dist/`.

### Astro environment contract

Set these values for the Astro process:

| Variable | Required value | Purpose |
| --- | --- | --- |
| `ASTRO_API_BASE_URL` | Absolute `http://` or `https://` URL for the Nest API | Server-only authority used to form `/landing/public`; it is never derived from `Host` or forwarded headers. |
| `ASTRO_PORT` | Documented private listener port, for example `4321` | Used only when `PORT` is unset; `server-entry.mjs` bridges it to the adapter's `PORT`. |
| `PORT` | Explicit private Astro listener port, for example `4321` | Takes precedence over `ASTRO_PORT` and must differ from Nest. Root `.env` sets `PORT=3000`, so override it for the Astro process; do not rely on `ASTRO_PORT` alone. |

`ASTRO_API_BASE_URL` must not be renamed with a `PUBLIC_` prefix. The root
`.env` is loaded by `server-entry.mjs` while explicit process variables retain
precedence. Because the root `.env` sets `PORT=3000`, the Astro process must
receive an explicit private `PORT` override; otherwise that value wins over
`ASTRO_PORT` and collides with Nest. The Astro listener should bind privately;
Caddy is the public entry point.

### Astro route/process contract

The Astro process must satisfy all of these conditions:

- serve the built `apps/web/dist/server` and `apps/web/dist/client` output;
- render `GET /` through the server-side landing page;
- render `/admin*`, `/posts*`, `/outings*`, and other web documents through the
  Astro catch-all route, which hydrates the existing React application;
- serve emitted `/_astro/*` assets from the same private listener; and
- remain restartable independently of Nest while Caddy keeps API requests on
  the Nest upstream.

## Ordered Caddy dispatch

Use a literal `route` block. Caddy evaluates these mutually exclusive
`handle` blocks in the order shown, so the two Astro cases and the HTML
document requests are resolved before the API and final Astro fallback.

```caddyfile
@astro_assets path /_astro/*
@astro_root path /
@web_documents {
	method GET
	path /posts /posts/* /outings /outings/*
	header Accept *text/html*
}
@api {
	path /api /api/* /auth /auth/* /files /files/* /health /landing /landing/* /posts /posts/* /outings /outings/* /responsibles /responsibles/* /verses /verses/*
}

route {
	handle @astro_assets {
		reverse_proxy <astro-upstream>
	}
	handle @astro_root {
		reverse_proxy <astro-upstream>
	}
	handle @web_documents {
		reverse_proxy <astro-upstream>
	}
	handle @api {
		reverse_proxy <nest-upstream>
	}
	handle {
		reverse_proxy <astro-upstream>
	}
}
```

### Route matrix

The API matcher intentionally overlaps `/posts*` and `/outings*` with the
web-document matcher. Ordering is the contract: only `GET` requests whose
`Accept` header contains `text/html` take the web document branch. Fetches
using `Accept: */*`, missing `Accept`, and every non-`GET` method continue to
the API branch.

| Request | First matching branch | Upstream | Expected purpose |
| --- | --- | --- | --- |
| `GET /` | `@astro_root` | Astro | Server-rendered landing HTML |
| `GET /_astro/<asset>` | `@astro_assets` | Astro | Hashed Astro CSS/client asset |
| `GET /posts` or `/posts/<slug>` with `Accept: text/html` | `@web_documents` | Astro | React public document navigation |
| `GET /outings` or `/outings/<slug>` with `Accept: text/html` | `@web_documents` | Astro | React public document navigation |
| `GET /posts*` or `/outings*` with `Accept: */*` or no HTML accept | `@api` | Nest | JSON data fetch |
| `POST /outings/<slug>/like` | `@api` | Nest | API mutation |
| `/auth*`, `/files*`, `/health`, `/landing*`, `/responsibles*`, `/verses*` | `@api` | Nest | Auth, files, health, landing data, and domain APIs |
| `/admin*`, other web assets, and unmatched paths | final `handle` | Astro | React/admin fallback or Astro response |

Do not reorder the handles, replace them with unordered top-level proxy
directives, or collapse `/posts*` and `/outings*` into prefix-only routing.
Those changes can turn browser navigation into JSON or send API calls to the
Astro document server.

## 503 monitoring and response

The Astro page returns `503 Service Unavailable` when the configured landing
API is unavailable, non-successful, invalid, or otherwise cannot produce a
valid payload. The body is deliberately generic: it must not expose the API
host, upstream status/body, failure reason, stack, or database details.

Monitor the public landing separately from the process and API health checks:

1. Alert on a repeated external `GET /` response of `503`, not on a single
   transient probe.
2. Check the Astro process and its private listener first, then check Nest's
   private `GET /health` endpoint and the reachability of the configured
   `ASTRO_API_BASE_URL` from the Astro process.
3. Inspect service logs and process-manager status without copying upstream
   details into the public response. Do not respond by exposing diagnostic
   environment values.
4. If Nest is unhealthy, repair or restore the API first; the Astro process
   and React admin do not require a data or schema rollback.
5. If Nest is healthy but Astro cannot serve the landing, restart or roll back
   the Astro process and temporarily send the root handle to the verified
   Astro upstream. Leave API, cookies, admin routes, and database state
   unchanged.
6. After recovery, repeat the route matrix and confirm that `GET /` is back
   to `200` with server-rendered content and that the emitted Astro asset is
   reachable.

## Rollback

Rollback is a routing/process operation, not a data migration:

1. Stop or isolate the Astro Node process.
2. Remove or bypass the `@astro_assets` and `@astro_root` handles and restore
   the previous root dispatch.
3. Keep the Nest API, authentication cookies, React admin, database, and
   uploaded-file storage unchanged.
4. Verify the previous root and `/admin` behavior before considering the
   rollback complete.

## Local documentation validation

These checks validate the repository artifacts without a VPS, Caddy binary,
production process, or deployment state:

```sh
pnpm exec prettier --check docs/astro-landing-deployment.md docs/README.md
pnpm --filter @m199/web exec astro check
pnpm --filter @m199/web build
git diff --check
```

The route matrix is validated by static review of the named matchers and their
order. A local Astro build proves the referenced `dist/` server/assets; the
command does not start Caddy or change a VPS. The independent SSR proof in
`apps/web/src/lib/server/ssr-proof.test.mjs` remains the runtime evidence for
the built Astro 200/503 and `/_astro/*` behavior.

## Deployment boundary

This guide does not define real upstream socket names, process-manager unit
files, firewall rules, TLS settings, VPS directories, or an API production
build/start command. Those are operator-owned prerequisites and must be
resolved before applying the template. No production configuration is
considered changed by this documentation.
