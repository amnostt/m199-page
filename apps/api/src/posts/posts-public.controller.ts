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

/**
 * Maps an internal post row to the public response shape.
 * Uses the service's internal row shape and exposes only public fields.
 */
function toPublicResponse(row: {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageId: string | null;
  content: string;
  status: string;
  tags: string[];
  publishedAt: Date | null;
  downloads?: { label: string | null; fileId: string }[];
}): PostPublicResponse {
  const fileUrl = (fileId: string | null): string | null =>
    fileId ? `/files/${fileId}` : null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverImageUrl: fileUrl(row.coverImageId),
    content: row.content,
    status: "PUBLISHED",
    tags: row.tags,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    downloads: (row.downloads ?? []).map((dl) => ({
      label: dl.label,
      fileUrl: `/files/${dl.fileId}`,
    })),
  };
}

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
    const post = await this.postsService.findBySlug(slug);
    if (!post || post.status !== "PUBLISHED") {
      throw new NotFoundException(`Post "${slug}" not found`);
    }
    return toPublicResponse(post);
  }
}
