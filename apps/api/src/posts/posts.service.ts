/**
 * PostsService — CRUD, lifecycle, and sanitization for posts (PR 1).
 *
 * Task 1.8-1.13: Core service logic following the OutingsService pattern.
 * Minimal Prisma interfaces avoid static @prisma/client imports (BF-02).
 *
 * - create: sanitizes content, validates FileAsset categories, handles slug conflicts.
 * - update: partial update, never touches FeaturedPost.featuredAt.
 * - publish: sets PUBLISHED with publishedAt when first published.
 * - archive: sets ARCHIVED and deletes FeaturedPost row.
 * - delete: cascades downloads + featured row in a transaction.
 * - findAll: admin pagination with optional status filter.
 * - findBySlug: lookup by slug.
 * - findAllPublic: PUBLISHED-only with response mapping.
 */
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DbService } from "../db/db.service.js";
import { sanitizePostContent } from "./sanitizer.js";
import type { CreatePostDto } from "./dto/create-post.dto.js";
import type { UpdatePostDto } from "./dto/update-post.dto.js";
import type { PostListQueryDto } from "./dto/post-list-query.dto.js";

// ---------------------------------------------------------------------------
// Minimal Prisma-model interfaces
// ---------------------------------------------------------------------------

export interface PostRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageId: string | null;
  content: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  tags: string[];
  createdById: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeaturedPostRow {
  id: string;
  slot: "SLOT_1" | "SLOT_2" | "SLOT_3";
  postId: string;
  featuredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostDownloadRow {
  id: string;
  postId: string;
  fileId: string;
  label: string | null;
  sortOrder: number;
  createdAt: Date;
}

interface FileAssetRow {
  id: string;
  category?: string;
}

interface PostPrismaClient {
  post: {
    create(args: { data: Record<string, unknown> }): Promise<PostRow>;
    findUnique(args: { where: Record<string, unknown> }): Promise<PostRow | null>;
    findMany(args?: {
      where?: Record<string, unknown>;
      skip?: number;
      take?: number;
      orderBy?: Record<string, unknown>;
    }): Promise<PostRow[]>;
    update(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<PostRow>;
    delete(args: { where: Record<string, unknown> }): Promise<PostRow>;
  };
  fileAsset: {
    findUnique(args: {
      where: Record<string, unknown>;
    }): Promise<FileAssetRow | null>;
  };
  postDownload: {
    create(args: { data: Record<string, unknown> }): Promise<PostDownloadRow>;
    deleteMany(args: {
      where: Record<string, unknown>;
    }): Promise<{ count: number }>;
  };
  featuredPost: {
    create(args: { data: Record<string, unknown> }): Promise<FeaturedPostRow>;
    findUnique(args: {
      where: Record<string, unknown>;
    }): Promise<FeaturedPostRow | null>;
    delete(args: { where: Record<string, unknown> }): Promise<FeaturedPostRow>;
    count(args?: { where?: Record<string, unknown> }): Promise<number>;
    findMany(args?: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
      take?: number;
    }): Promise<FeaturedPostRow[]>;
  };
  $transaction<T>(fn: (tx: PostPrismaClient) => Promise<T>): Promise<T>;
}

// ---------------------------------------------------------------------------
// Public response shape
// ---------------------------------------------------------------------------

export interface PostPublicResponse {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  content: string;
  status: "PUBLISHED";
  tags: string[];
  publishedAt: string | null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PostsService {
  constructor(
    @Inject(DbService) private readonly dbService: DbService,
  ) {}

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private get client(): PostPrismaClient {
    return this.dbService.client as unknown as PostPrismaClient;
  }

  /** Resolves a file ID to a public URL path, or null if no ID. */
  private fileUrl(fileId: string | null | undefined): string | null {
    if (!fileId) return null;
    return `/files/${fileId}`;
  }

  /** Maps an internal PostRow to the public PostPublicResponse shape. */
  private toPublicResponse(row: PostRow): PostPublicResponse {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      coverImageUrl: this.fileUrl(row.coverImageId),
      content: row.content,
      status: "PUBLISHED",
      tags: row.tags,
      publishedAt: row.publishedAt?.toISOString() ?? null,
    };
  }

  /**
   * Validates a FileAsset exists and has the expected category.
   * Throws BadRequestException if the file is missing or has wrong category.
   */
  private async validateFileCategory(
    fileId: string,
    expectedCategory: string,
  ): Promise<void> {
    const asset = await this.client.fileAsset.findUnique({
      where: { id: fileId },
    });
    if (!asset) {
      throw new BadRequestException(`FileAsset with id "${fileId}" not found`);
    }
    if (asset.category !== expectedCategory) {
      throw new BadRequestException(
        `FileAsset "${fileId}" must have category ${expectedCategory}`,
      );
    }
  }

  // -----------------------------------------------------------------------
  // CRUD
  // -----------------------------------------------------------------------

  /**
   * Creates a post with sanitized content (Task 1.9).
   *
   * Validates coverImageId (POST_COVER_IMAGE) and downloadIds (POST_DOWNLOAD)
   * FileAsset categories. Defaults status to DRAFT.
   */
  async create(dto: CreatePostDto): Promise<PostRow> {
    const status = dto.status ?? "DRAFT";

    // Validate cover image category
    if (dto.coverImageId) {
      await this.validateFileCategory(dto.coverImageId, "POST_COVER_IMAGE");
    }

    // Validate download file categories
    if (dto.downloadIds && dto.downloadIds.length > 0) {
      for (const fileId of dto.downloadIds) {
        await this.validateFileCategory(fileId, "POST_DOWNLOAD");
      }
    }

    // Sanitize content before persistence
    const sanitizedContent = sanitizePostContent(dto.content);

    try {
      const post = await this.client.post.create({
        data: {
          title: dto.title,
          slug: dto.slug,
          content: sanitizedContent,
          description: dto.description ?? "",
          coverImageId: dto.coverImageId ?? null,
          tags: dto.tags ?? [],
          status,
        },
      });

      // Wire download rows
      if (dto.downloadIds && dto.downloadIds.length > 0) {
        for (let i = 0; i < dto.downloadIds.length; i++) {
          await this.client.postDownload.create({
            data: {
              postId: post.id,
              fileId: dto.downloadIds[i]!,
              sortOrder: i,
            },
          });
        }
      }

      return post;
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "P2002") {
        throw new ConflictException(`Slug "${dto.slug}" already exists`);
      }
      throw err;
    }
  }

  /**
   * Partially updates a post (Task 1.10).
   *
   * Normal edits never touch FeaturedPost.featuredAt. Sanitizes content
   * when provided.
   */
  async update(id: string, dto: UpdatePostDto): Promise<PostRow> {
    const existing = await this.client.post.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Post "${id}" not found`);
    }

    const data: Record<string, unknown> = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.coverImageId !== undefined) data.coverImageId = dto.coverImageId;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.status !== undefined) data.status = dto.status;

    // Sanitize content if provided
    if (dto.content !== undefined) {
      data.content = sanitizePostContent(dto.content);
    }

    // Validate cover image category if changing
    if (dto.coverImageId) {
      await this.validateFileCategory(dto.coverImageId, "POST_COVER_IMAGE");
    }

    // Validate download file categories if provided
    if (dto.downloadIds && dto.downloadIds.length > 0) {
      for (const fileId of dto.downloadIds) {
        await this.validateFileCategory(fileId, "POST_DOWNLOAD");
      }
    }

    try {
      const updated = await this.client.post.update({
        where: { id },
        data,
      });

      // Replace download rows when downloadIds is provided
      if (dto.downloadIds !== undefined) {
        await this.client.postDownload.deleteMany({
          where: { postId: id },
        });
        for (let i = 0; i < dto.downloadIds.length; i++) {
          await this.client.postDownload.create({
            data: {
              postId: id,
              fileId: dto.downloadIds[i]!,
              sortOrder: i,
            },
          });
        }
      }

      return updated;
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "P2002") {
        throw new ConflictException("Slug already exists");
      }
      if (pgErr.code === "P2025") {
        throw new NotFoundException(`Post "${id}" not found`);
      }
      throw err;
    }
  }

  /**
   * Publishes a post (Task 1.11).
   *
   * Sets status to PUBLISHED. Sets publishedAt now only when first
   * published; preserves existing publishedAt on republish.
   */
  async publish(id: string): Promise<PostRow> {
    const existing = await this.client.post.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Post "${id}" not found`);
    }

    // Only set publishedAt if not already published
    const publishedAt = existing.publishedAt ?? new Date();

    return this.client.post.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt,
      },
    });
  }

  /**
   * Archives a post (Task 1.11).
   *
   * Sets status to ARCHIVED and deletes the FeaturedPost row if it exists.
   * Uses a transaction to ensure both operations succeed or fail together.
   */
  async archive(id: string): Promise<PostRow> {
    const existing = await this.client.post.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Post "${id}" not found`);
    }

    return this.client.$transaction(async (tx) => {
      // Delete FeaturedPost row if it exists (P2025 caught = idempotent)
      try {
        await tx.featuredPost.delete({ where: { postId: id } });
      } catch (err: unknown) {
        const pgErr = err as { code?: string };
        // P2025 = record not found — no featured row to delete, that's OK
        if (pgErr.code !== "P2025") {
          throw err;
        }
      }

      return tx.post.update({
        where: { id },
        data: { status: "ARCHIVED" },
      });
    });
  }

  /**
   * Deletes a post and its related downloads + featured row (Task 1.11).
   *
   * All deletions run in a single transaction so cleanup always completes
   * or rolls back together.
   */
  async delete(id: string): Promise<void> {
    const existing = await this.client.post.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Post "${id}" not found`);
    }

    await this.client.$transaction(async (tx) => {
      // Delete downloads
      await tx.postDownload.deleteMany({ where: { postId: id } });

      // Delete featured row (if any)
      try {
        await tx.featuredPost.delete({ where: { postId: id } });
      } catch (err: unknown) {
        const pgErr = err as { code?: string };
        if (pgErr.code !== "P2025") {
          throw err;
        }
      }

      // Delete the post
      await tx.post.delete({ where: { id } });
    });
  }

  /**
   * Lists posts with optional status filter and pagination (Task 1.12).
   */
  async findAll(query: PostListQueryDto): Promise<PostRow[]> {
    const where: Record<string, unknown> = {};
    if (query.status) {
      where.status = query.status;
    }

    return this.client.post.findMany({
      where,
      skip: query.skip,
      take: query.take,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Finds a single post by slug (Task 1.12).
   */
  async findBySlug(slug: string): Promise<PostRow | null> {
    return this.client.post.findUnique({
      where: { slug },
    });
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Returns only PUBLISHED posts mapped to PostPublicResponse (Task 1.13).
   *
   * Internal fields (createdById, createdAt, updatedAt) are excluded.
   * coverImageId is resolved to a public URL path.
   */
  async findAllPublic(): Promise<PostPublicResponse[]> {
    const rows = await this.client.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
    });
    return rows.map((row) => this.toPublicResponse(row));
  }
}
