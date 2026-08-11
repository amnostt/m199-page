import { Module } from "@nestjs/common";
import { DbModule } from "../db/db.module.js";
import { MissionsService } from "./missions.service.js";

@Module({
  imports: [DbModule],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
