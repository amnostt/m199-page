/**
 * VersesModule — daily verse management module.
 *
 * Imports AuthModule for admin controller guards. DbModule is @Global()
 * so VersesService injection works without explicit import.
 */
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { VersesService } from "./verses.service.js";
import { VersesAdminController } from "./verses-admin.controller.js";
import { VersesPublicController } from "./verses-public.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [VersesAdminController, VersesPublicController],
  providers: [VersesService],
  exports: [VersesService],
})
export class VersesModule {}
