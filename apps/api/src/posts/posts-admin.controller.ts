/**
 * PostsAdminController — protected admin CRUD, lifecycle, and feature management.
 *
 * GET    /posts/admin              — list posts (optional status/pagination).
 * GET    /posts/admin/slug/:slug  — read one post for editing (by slug).
 * POST   /posts/admin              — create a post.
 * PATCH  /posts/admin/:id          — update a post.
 * POST   /posts/admin/:id/publish  — publish a post.
 * POST   /posts/admin/:id/archive  — archive a post.
 * DELETE /posts/admin/:id          — delete a post.
 * POST   /posts/admin/:id/feature  — feature a PUBLISHED post.
 * DELETE /posts/admin/:id/feature  — unfeature a post.
 *
 * Protected by AuthGuard at controller level: only authenticated
 * ACTIVE responsible users may access these endpoints.
 * Unauthenticated requests receive 401.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { PostsService } from "./posts.service.js";
import { CreatePostDto } from "./dto/create-post.dto.js";
import { UpdatePostDto } from "./dto/update-post.dto.js";
import { PostListQueryDto } from "./dto/post-list-query.dto.js";

@Controller("posts/admin")
@UseGuards(AuthGuard)
export class PostsAdminController {
  constructor(
    @Inject(PostsService)
    private readonly postsService: PostsService,
  ) {}

  /**
   * Lists posts with optional status filter and pagination.
   */
  @Get()
  async findAll(@Query() query: PostListQueryDto) {
    return this.postsService.findAll(query);
  }

  /**
   * Reads a single post by slug for admin editing.
   */
  @Get("slug/:slug")
  async findOne(@Param("slug") slug: string) {
    return this.postsService.findBySlug(slug);
  }

  /**
   * Creates a post with validated DTO.
   */
  @Post()
  async create(
    @Body(
      new ValidationPipe({
        expectedType: CreatePostDto,
        transform: true,
        whitelist: true,
      }),
    )
    dto: CreatePostDto,
  ) {
    return this.postsService.create(dto);
  }

  /**
   * Partially updates a post by ID.
   */
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        expectedType: UpdatePostDto,
        transform: true,
        whitelist: true,
      }),
    )
    dto: UpdatePostDto,
  ) {
    return this.postsService.update(id, dto);
  }

  /**
   * Publishes a post (sets PUBLISHED, sets publishedAt when first published).
   */
  @Post(":id/publish")
  async publish(@Param("id") id: string) {
    return this.postsService.publish(id);
  }

  /**
   * Archives a post (sets ARCHIVED, deletes FeaturedPost row).
   */
  @Post(":id/archive")
  async archive(@Param("id") id: string) {
    return this.postsService.archive(id);
  }

  /**
   * Deletes a post and related downloads + featured row in a transaction.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string): Promise<void> {
    await this.postsService.delete(id);
  }

  /**
   * Features a PUBLISHED post (max 3 active, first-free slot).
   */
  @Post(":id/feature")
  async feature(@Param("id") id: string) {
    return this.postsService.feature(id);
  }

  /**
   * Unfeatures a post by deleting its FeaturedPost row (idempotent).
   */
  @Delete(":id/feature")
  async unfeature(@Param("id") id: string) {
    return this.postsService.unfeature(id);
  }
}
