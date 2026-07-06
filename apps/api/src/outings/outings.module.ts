/**
 * OutingsModule — outing management and public display.
 *
 * Phase 1: Module skeleton registering future controllers/service.
 * Phase 2a: OutingsService with core CRUD and publish-readiness guard.
 * Phase 2b: findAllPublic, visitor hash derivation, transactional likes,
 *           featured outing delegation via LandingService.
 * Phase 3: Admin and public controllers wired.
 *
 * Imports DbModule explicitly for clarity (following FileModule precedent),
 * even though DbModule is @Global(). Imports LandingModule for featureOuting
 * delegation (OUT-05).
 */
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DbModule } from "../db/db.module.js";
import { LandingModule } from "../landing/landing.module.js";
import { OutingsAdminController } from "./outings-admin.controller.js";
import { OutingsPublicController } from "./outings-public.controller.js";
import { OutingsService } from "./outings.service.js";

@Module({
  imports: [AuthModule, DbModule, LandingModule],
  controllers: [OutingsAdminController, OutingsPublicController],
  providers: [OutingsService],
})
export class OutingsModule {}
