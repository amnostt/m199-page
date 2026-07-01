/**
 * Auth controller — login, refresh, and logout endpoints.
 *
 * All cookie handling is delegated to AuthService so the controller
 * stays thin — it accepts validated DTOs and forwards to the service.
 * No routes are behind AuthGuard (login is unauthenticated; refresh
 * and logout use the refresh_token cookie directly).
 */
import { Body, Controller, Inject, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService, type AuthUser } from "./auth.service.js";
import { LoginDto } from "./dto/login.dto.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  /**
   * AR-01: Authenticate by email + password.
   *
   * Returns user profile and sets httpOnly access_token + refresh_token
   * cookies on success. Returns 401 for invalid credentials, 403 for
   * inactive users.
   */
  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    return this.authService.login(dto, res);
  }

  /**
   * AR-02: Refresh the access + refresh token pair.
   *
   * Reads the current refresh_token cookie, rotates the session, and
   * sets new cookies. Returns 401 for invalid/revoked tokens, 403 for
   * inactive users.
   */
  @Post("refresh")
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    return this.authService.refresh(req, res);
  }

  /**
   * AR-03: Logout — revoke the current refresh session and clear cookies.
   *
   * Idempotent: if the token is missing or already revoked, cookies are
   * still cleared and the request succeeds.
   */
  @Post("logout")
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(req, res);
    return { message: "Logged out" };
  }
}
