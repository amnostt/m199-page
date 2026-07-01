/**
 * ResponsiblesModule — responsible-user CRUD and password reset.
 *
 * Imports AuthModule to access AuthGuard (route protection) and
 * AuthService (session revocation on deactivation and password reset).
 *
 * No global interceptors or APP-level providers are registered here —
 * those belong to AuthModule.
 */
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { ResponsiblesController } from "./responsibles.controller.js";
import { ResponsiblesService } from "./responsibles.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ResponsiblesController],
  providers: [ResponsiblesService],
})
export class ResponsiblesModule {}
