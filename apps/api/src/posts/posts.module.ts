/**
 * PostsModule — post management module (PR 1: foundation skeleton).
 *
 * Phase 1: Module skeleton with PostsService provider (no controllers yet).
 * Phase 2 (PR 2): Admin and public controllers wired.
 *
 * Imports AuthModule for future controller guards. DbModule is @Global()
 * so PostService injection works without explicit import.
 */
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PostsService } from "./posts.service.js";

@Module({
  imports: [AuthModule],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
