/**
 * OutingsModule — outing management and public display.
 *
 * Phase 1: Module skeleton registering future controllers/service.
 * Phase 2a: OutingsService with core CRUD and publish-readiness guard.
 *
 * Phase 2b (deferred, next PR slice): findAllPublic, visitor hash
 * derivation, transactional likes, featured outing delegation.
 *
 * Imports DbModule explicitly for clarity (following FileModule precedent),
 * even though DbModule is @Global().
 */
import { Module } from "@nestjs/common";
import { DbModule } from "../db/db.module.js";
import { OutingsService } from "./outings.service.js";

@Module({
  imports: [DbModule],
  providers: [OutingsService],
})
export class OutingsModule {}
