/**
 * OutingsModule — outing management and public display.
 *
 * Phase 1: Module skeleton registering future controllers/service.
 * Phase 2a: OutingsService with core CRUD and publish-readiness guard.
 * Phase 2b: findAllPublic, visitor hash derivation, transactional likes,
 *           featured outing delegation via LandingService.
 *
 * Imports DbModule explicitly for clarity (following FileModule precedent),
 * even though DbModule is @Global(). Imports LandingModule for featureOuting
 * delegation (OUT-05).
 */
import { Module } from "@nestjs/common";
import { DbModule } from "../db/db.module.js";
import { LandingModule } from "../landing/landing.module.js";
import { OutingsService } from "./outings.service.js";

@Module({
  imports: [DbModule, LandingModule],
  providers: [OutingsService],
})
export class OutingsModule {}
