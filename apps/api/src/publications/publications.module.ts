import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DbModule } from "../db/db.module.js";
import { PublicationsAdminController } from "./publications-admin.controller.js";
import { PublicationsService } from "./publications.service.js";
import { PublicationsPublicController } from "./publications-public.controller.js";

@Module({
  imports: [DbModule, AuthModule],
  providers: [PublicationsService],
  controllers: [PublicationsAdminController, PublicationsPublicController],
  exports: [PublicationsService],
})
export class PublicationsModule {}
