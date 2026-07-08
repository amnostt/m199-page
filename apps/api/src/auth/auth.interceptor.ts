/**
 * AuthInterceptor — Origin header validation for CSRF protection.
 *
 * Validates the `Origin` request header on all mutating endpoints
 * (POST, PUT, PATCH, DELETE). GET, HEAD, and OPTIONS requests are
 * exempt — they cannot trigger state changes.
 *
 * The expected origin is read from validated ConfigService `API_ORIGIN`,
 * defaulting to `http://localhost:{PORT}`. Combined with `SameSite=Lax` on auth
 * cookies, this provides defence-in-depth against CSRF attacks without
 * requiring a separate CSRF token.
 *
 * Registered as a global APP_INTERCEPTOR in AuthModule so every route
 * in the API benefits from the protection.
 */
import {
  type CallHandler,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import type { Observable } from "rxjs";

/** HTTP methods that are safe (no side-effects) — exempt from Origin check. */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class AuthInterceptor implements NestInterceptor {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();

    // Safe methods are exempt — they cannot mutate state.
    if (SAFE_METHODS.has(req.method)) {
      return next.handle();
    }

    // Resolve the allowed origin from validated configuration.
    const port = this.config.get<number>("PORT", 3000);
    const allowed =
      this.config.get<string>("API_ORIGIN") ??
      `http://localhost:${String(port)}`;

    const origin = req.headers.origin;

    if (!origin || origin !== allowed) {
      throw new ForbiddenException("Invalid origin");
    }

    return next.handle();
  }
}
