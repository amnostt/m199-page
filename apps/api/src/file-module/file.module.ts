/**
 * FileModule — file upload, serve, and remove.
 *
 * Imports AuthModule to access AuthGuard (route protection on FilesController).
 * Imports DbModule to access DbService (file metadata persistence).
 *
 * Registers FileService and both controllers:
 * - FilesController (POST /files/:category, DELETE /files/:id) — protected by AuthGuard
 * - FilesPublicController (GET /files/:id, GET /files/:id/thumb) — public
 */
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DbModule } from "../db/db.module.js";
import { FileService } from "./file.service.js";
import { FilesController } from "./file.controller.js";
import { FilesPublicController } from "./files-public.controller.js";

@Module({
  imports: [DbModule, AuthModule],
  controllers: [FilesPublicController, FilesController],
  providers: [FileService],
})
export class FileModule {}
