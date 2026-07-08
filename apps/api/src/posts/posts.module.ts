/**
 * PostsModule — post management module.
 *
 * Wires PostsService, admin controller, and public controller.
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
