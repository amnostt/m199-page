/**
 * Auth module — JWT, cookie-based authentication, and CSRF protection.
 *
 * Registers JwtModule with a required `JWT_SECRET` env var, provides
 * AuthService / AuthGuard / AuthInterceptor, and exports AuthGuard +
 * AuthService so ResponsiblesModule (PR 2) can protect routes and revoke
 * refresh sessions.
 *
 * AuthInterceptor is registered as a global APP_INTERCEPTOR: it
 * validates the Origin header on every mutating request across the
 * entire API, not only auth routes. Combined with SameSite=Lax
 * cookies this provides defence-in-depth CSRF protection.
 */
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthInterceptor } from "./auth.interceptor.js";
import { AuthService } from "./auth.service.js";
import { ACCESS_TOKEN_TTL } from "./auth.constants.js";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: ACCESS_TOKEN_TTL },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthInterceptor,
    },
  ],
  exports: [AuthGuard, AuthService, JwtModule],
})
export class AuthModule {}
