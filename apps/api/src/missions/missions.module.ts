import { Module } from "@nestjs/common";
import { DbModule } from "../db/db.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { MissionsService } from "./missions.service.js";
import { MissionsAdminController } from "./missions-admin.controller.js";
import { MissionsPublicController } from "./missions-public.controller.js";

@Module({
  imports: [DbModule, AuthModule],
  providers: [MissionsService],
  controllers: [MissionsAdminController, MissionsPublicController],
  exports: [MissionsService],
})
export class MissionsModule {}
