/**
 * PostsModule — post management module (PR 1: foundation skeleton, PR 2: controllers).
 *
 * Phase 1: Module skeleton with PostsService provider (no controllers).
 * Phase 2 (PR 2): Admin and public controllers wired.
 *
 * Imports AuthModule for controller guards. DbModule is @Global()
 * so PostsService injection works without explicit import.
 */
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PostsService } from "./posts.service.js";
import { PostsAdminController } from "./posts-admin.controller.js";
import { PostsPublicController } from "./posts-public.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [PostsAdminController, PostsPublicController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
