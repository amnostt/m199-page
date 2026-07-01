# Design: Auth and Responsible Users

## Technical Approach

Add a NestJS `AuthModule` (login/refresh/logout) and `ResponsiblesModule` (CRUD/password-reset) to `apps/api/src/`. Access tokens use `@nestjs/jwt` (15m, stateless) and opaque refresh tokens are hashed in `RefreshSession` (7d, revocable). Both travel as `httpOnly` cookies. A shared `AuthGuard` verifies JWT and enforces ACTIVE status on every guard-protected route. CSRF is mitigated via `SameSite=Lax` cookies plus an `Origin` header validation interceptor on all mutating endpoints (POST, PUT, PATCH, DELETE). No public registration; first responsible user created via seed.

## Architecture Decisions

| Decision | Option | Tradeoff | Choice |
|----------|--------|----------|--------|
| Access tokens | JWT (stateless) | No per-request DB lookup; needs secret rotation on compromise | `@nestjs/jwt`, 15m TTL, cookie `access_token` |
| Refresh tokens | Opaque random + DB hash | Enables per-session revocation; DB lookup required on refresh | `crypto.randomBytes` → SHA-256 → `RefreshSession.tokenHash` |
| Password hashing | bcrypt | Mature, constant-time; native addon optional | `bcryptjs` (pure JS, zero native deps) |
| Cookie transport | httpOnly + SameSite cookies | Blocks XSS; `sameSite:lax` plus Origin validation covers CSRF | `res.cookie` with `httpOnly`, `sameSite:lax`, `secure` (prod) |
| CSRF protection | SameSite + Origin validation | Browser-native CSRF mitigation plus server-side check; no extra token state | `SameSite=Lax` on auth cookies; NestJS interceptor validates `Origin` header on mutating endpoints (POST/PUT/PATCH/DELETE) |
| Guard placement | AuthModule export | No shared/guards module yet; single import path | `AuthGuard` exported from `AuthModule` |
| Module split | Auth vs Responsibles | Separate concerns; Responsibles imports Auth for guard | Two modules, `ResponsiblesModule` imports `AuthModule` |

## Data Flow

### Login

```
POST /auth/login {email, password}
     │
     ├─1─► AuthService: find user by email (DbService)
     │     ├─ INACTIVE? → 403
     │     └─ bcrypt.compare → fail? 401
     ├─2─► Sign JWT (sub: userId, type: "access", 15m)
     ├─3─► Generate opaque refresh token, SHA-256 hash
     ├─4─► INSERT RefreshSession (ACTIVE, expiresAt +7d)
     └─5─► Set httpOnly cookies → 200
```

### Refresh

```
POST /auth/refresh [cookie: refresh_token]
     │
     ├─1─► Hash cookie → find ACTIVE session by tokenHash
     │     ├─ NOT FOUND or EXPIRED? → 401, clear cookies
     │     └─ User INACTIVE? → 403, clear cookies
     ├─2─► Generate new access + refresh pair
     ├─3─► In transaction: REVOKE old session, INSERT new
     └─4─► Set new cookies → 200
```

### Guarded endpoint

```
GET /responsibles [cookie: access_token]
     │
     ├─1─► AuthGuard: extract cookie, verify JWT
     ├─2─► Look up user by payload.sub
     └─3─► INACTIVE? → 403 : attach {id,email,displayName} → proceed
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/auth/auth.module.ts` | Create | Registers JwtModule, exports AuthGuard |
| `apps/api/src/auth/auth.service.ts` | Create | login, refresh, logout, token+session lifecycle |
| `apps/api/src/auth/auth.controller.ts` | Create | POST `/auth/login`, `/auth/refresh`, `/auth/logout` |
| `apps/api/src/auth/auth.guard.ts` | Create | `CanActivate`: cookie→JWT→status check, returns 401/403 |
| `apps/api/src/auth/auth.constants.ts` | Create | Cookie names, TTLs |
| `apps/api/src/auth/auth.interceptor.ts` | Create | `Origin` header validation for CSRF on mutation endpoints |
| `apps/api/src/auth/dto/login.dto.ts` | Create | `@IsEmail` email, `@IsString` `@MinLength(8)` password |
| `apps/api/src/responsibles/responsibles.module.ts` | Create | Imports AuthModule |
| `apps/api/src/responsibles/responsibles.controller.ts` | Create | CRUD + `PATCH /:id/password` behind `@UseGuards(AuthGuard)` |
| `apps/api/src/responsibles/responsibles.service.ts` | Create | CRUD, deactivation→bulk-revoke, password-reset→bulk-revoke |
| `apps/api/src/responsibles/dto/create-responsible.dto.ts` | Create | email, displayName, password |
| `apps/api/src/responsibles/dto/update-responsible.dto.ts` | Create | Partial<displayName, status> |
| `apps/api/src/responsibles/dto/reset-password.dto.ts` | Create | newPassword only |
| `apps/api/src/app.module.ts` | Modify | Import AuthModule, ResponsiblesModule |
| `apps/api/src/main.ts` | Modify | Add `cookie-parser` middleware |
| `apps/api/package.json` | Modify | Add `@nestjs/jwt`, `bcryptjs`, `cookie-parser`, `@types/cookie-parser` |

## Interfaces / Contracts

```typescript
// AuthGuard attaches to request after successful verification
interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; displayName: string };
}

// JWT payload (access token only; refresh tokens are opaque, not JWT)
interface AccessTokenPayload { sub: string; type: "access"; }

// Refresh token is crypto.randomBytes(48).toString('hex'), stored as SHA-256 hash
```

DTOs follow existing `class-validator` + `class-transformer` pattern from `EchoDto`. Responses never include `passwordHash`.

**CSRF interceptor behaviour**: validates `Origin` header against the configured origin (`API_ORIGIN` env var, defaults to `http://localhost:{PORT}`). If absent or mismatched on a mutation endpoint, returns 403. GET/HEAD/OPTIONS requests are exempt.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `AuthService`: login/refresh/logout logic, rotation | `Test.createTestingModule`, mock DbService (follows `db.service.test.ts`) |
| Unit | `AuthGuard`: JWT verification, cookie extraction, status enforcement | Direct instantiation with mock JwtService + DbService |
| Unit | `AuthInterceptor`: Origin header validation, safe method bypass | Direct instantiation, mock ExecutionContext with varying origins |
| Unit | `ResponsiblesService`: CRUD, bulk revocation on deactivate/reset | Mock DbService, assert transaction calls |
| Integration | Controller + pipe: DTO validation errors, cookie headers, error envelopes | `Test.createTestingModule` + `applyGlobalPipes` (follows `bootstrap.wiring.test.ts`) |
| Integration | Auth lifecycle: login→refresh→logout→refresh-rejected | Full AppModule test, exercise controllers directly |

## Migration / Rollout

No data migration — `ResponsibleUser` and `RefreshSession` models already exist in the schema. First user created via seed script (out of API scope). Add `cookie-parser` as Express middleware in `main.ts`.

## Open Questions

- [x] CSRF protection: resolved — `SameSite=Lax` cookies + `Origin` header validation interceptor on mutation endpoints (in-scope for MVP).
- [ ] Cookie `sameSite`/`secure` strategy: hardcoded via `NODE_ENV` check (`secure: NODE_ENV === 'production'`, `sameSite: 'lax'` always) or config-driven per environment?
