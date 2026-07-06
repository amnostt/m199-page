/**
 * LandingModule — landing page settings and public payload.
 *
 * LP-01: LandingAdminController (protected) — GET/PUT /landing/admin.
 * LP-02: LandingPublicController (public) — GET /landing/public.
 *
 * Imports AuthModule to access AuthGuard (route protection on admin controller).
 * Imports DbModule for LandingService (DbService is @Global(), but importing
 * explicitly follows the FileModule precedent for explicitness).
 *
 * Follows the file.module.ts split-controller pattern:
 * - Admin controller behind AuthGuard
 * - Public controller with no guard
 */
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { LandingService } from "./landing.service.js";
import { LandingAdminController } from "./landing-admin.controller.js";
import { LandingPublicController } from "./landing-public.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [LandingAdminController, LandingPublicController],
  providers: [LandingService],
  exports: [LandingService],
})
export class LandingModule {}
