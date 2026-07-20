/**
 * PostsPublicController — public post listing and detail.
 *
 * GET /posts            — list published posts.
 * GET /posts/:slug      — detail for a published post by slug.
 *
 * No auth guard — public routes by design.
 * DRAFT and ARCHIVED posts return 404.
 */
import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
} from "@nestjs/common";
import { PostsService } from "./posts.service.js";
import type { PostPublicResponse } from "./posts.service.js";

@Controller("posts")
export class PostsPublicController {
  constructor(
    @Inject(PostsService)
    private readonly postsService: PostsService,
  ) {}

  /**
   * Returns only PUBLISHED posts as PostPublicResponse.
   */
  @Get()
  async findAllPublic(): Promise<PostPublicResponse[]> {
    return this.postsService.findAllPublic();
  }

  /**
   * Returns a single PUBLISHED post by slug.
   *
   * Throws NotFoundException for missing or non-PUBLISHED posts.
   */
  @Get(":slug")
  async findBySlug(@Param("slug") slug: string): Promise<PostPublicResponse> {
    const post = await this.postsService.findPublicBySlug(slug);
    if (!post) {
      throw new NotFoundException(`Post "${slug}" not found`);
    }
    return post;
  }
}
