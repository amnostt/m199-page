/**
 * OutingsModule — outing management and public display.
 *
 * Phase 1: Module skeleton registering future controllers/service.
 * Imports DbModule explicitly for clarity (following FileModule precedent),
 * even though DbModule is @Global().
 */
import { Module } from "@nestjs/common";
import { DbModule } from "../db/db.module.js";

@Module({
  imports: [DbModule],
})
export class OutingsModule {}
