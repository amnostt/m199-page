/**
 * OutingsPublicController — public outings list, detail, and likes.
 *
 * GET  /outings           — list published outings (OUT-02, OUT-06).
 * GET  /outings/:slug     — detail for a published outing by slug (OUT-06).
 * POST /outings/:slug/like — like a published outing (OUT-07).
 *
 * No auth guard — public routes by design.
 * DRAFT and ARCHIVED outings return 404.
 */
import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { OutingsService } from "./outings.service.js";
import type { OutingResponse } from "./outings.service.js";

/** Resolves a file ID to a public URL path, or null if no ID. */
function fileUrl(fileId: string | null | undefined): string | null {
  if (!fileId) return null;
  return `/files/${fileId}`;
}

/**
 * Maps an internal outing row to the public OutingResponse shape.
 * Matches the private toOutingResponse method in OutingsService.
 */
function toOutingResponse(row: {
  id: string;
  slug: string;
  title: string;
  dateTime: Date;
  location: string;
  description: string;
  likesCount: number;
  mainImageId: string | null;
  croquisId: string | null;
  planId: string | null;
}): OutingResponse {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    dateTime: row.dateTime.toISOString(),
    location: row.location,
    description: row.description,
    status: "PUBLISHED",
    likesCount: row.likesCount,
    mainImageUrl: fileUrl(row.mainImageId),
    croquisUrl: fileUrl(row.croquisId),
    planUrl: fileUrl(row.planId),
  };
}

@Controller("outings")
export class OutingsPublicController {
  constructor(
    @Inject(OutingsService)
    private readonly outingsService: OutingsService,
  ) {}

  /**
   * Returns only PUBLISHED outings as OutingResponse (OUT-02, OUT-06).
   */
  @Get()
  async findAllPublic(): Promise<OutingResponse[]> {
    return this.outingsService.findAllPublic();
  }

  /**
   * Returns a single PUBLISHED outing by slug (OUT-06).
   *
   * Throws NotFoundException for missing or non-PUBLISHED outings.
   */
  @Get(":slug")
  async findBySlug(@Param("slug") slug: string): Promise<OutingResponse> {
    const outing = await this.outingsService.findBySlug(slug);
    if (!outing || outing.status !== "PUBLISHED") {
      throw new NotFoundException(`Outing "${slug}" not found`);
    }
    return toOutingResponse(outing);
  }

  /**
   * Likes a PUBLISHED outing from request signals (OUT-07).
   *
   * Resolves the slug to an outing ID, extracts the visitor IP and
   * User-Agent from the request, and delegates to the service for
   * privacy-safe, idempotent like deduplication.
   *
   * Throws NotFoundException for missing or non-PUBLISHED outings.
   */
  @Post(":slug/like")
  async like(
    @Param("slug") slug: string,
    @Req() req: Request,
  ): Promise<{ likesCount: number }> {
    const outing = await this.outingsService.findBySlug(slug);
    if (!outing || outing.status !== "PUBLISHED") {
      throw new NotFoundException(`Outing "${slug}" not found`);
    }

    const ip = req.ip ?? "0.0.0.0";
    const userAgent =
      (req.headers["user-agent"] as string | undefined) ?? "";

    return this.outingsService.addLike(outing.id, ip, userAgent);
  }
}
