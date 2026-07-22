/**
 * VersesService — CRUD, latest-selection, and public history for daily verses.
 *
 * - create: captures one server instant, derives publishedAt (UTC) and
 *   date (America/Lima), sets status PUBLISHED.
 * - delete: hard deletes a verse by id.
 * - getLatest: returns most recent PUBLISHED verse by publishedAt desc.
 * - getHistory: returns up to 100 previous PUBLISHED verses excluding the
 *   current latest (capped with take:101 to preserve 100 after filtering).
 * - findAll: admin listing of the most recent 200 verses (capped),
 *   ordered by publishedAt desc.
 *
 * Follows the same pattern as PostsService: minimal Prisma interfaces
 * avoid static @prisma/client imports (BF-02).
 */
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DbService } from "../db/db.service.js";
import type { CreateVerseDto } from "./dto/create-verse.dto.js";

// ---------------------------------------------------------------------------
// Minimal Prisma-model interfaces
// ---------------------------------------------------------------------------

export interface VerseRow {
  id: string;
  text: string;
  reference: string;
  date: Date;
  publishedAt: Date | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VersePrismaClient {
  verse: {
    create(args: { data: Record<string, unknown> }): Promise<VerseRow>;
    findUnique(args: {
      where: Record<string, unknown>;
    }): Promise<VerseRow | null>;
    findFirst(args?: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, unknown> | Record<string, string>[];
    }): Promise<VerseRow | null>;
    findMany(args?: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, unknown> | Record<string, string>[];
      take?: number;
    }): Promise<VerseRow[]>;
    delete(args: { where: Record<string, unknown> }): Promise<VerseRow>;
  };
  verseRevision: {
    deleteMany(args: {
      where: Record<string, unknown>;
    }): Promise<{ count: number }>;
  };
}

// ---------------------------------------------------------------------------
// Public response shape
// ---------------------------------------------------------------------------

export interface VersePublicResponse {
  id: string;
  text: string;
  reference: string;
  date: string;
  publishedAt: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives a calendar date in America/Lima (UTC-5, no DST) from a UTC instant.
 *
 * Stores as a Date at midnight UTC representing the Lima calendar date,
 * matching the existing Prisma `DateTime` date-only convention.
 */
function peruDateOnly(now: Date): Date {
  // Lima is UTC-5 all year. Convert UTC milliseconds to local Lima time,
  // then extract year/month/day and build a UTC midnight Date.
  const limaOffsetMs = -5 * 60 * 60 * 1000;
  const limaMs = now.getTime() + limaOffsetMs;
  const limaDate = new Date(limaMs);
  return new Date(
    Date.UTC(
      limaDate.getUTCFullYear(),
      limaDate.getUTCMonth(),
      limaDate.getUTCDate(),
    ),
  );
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class VersesService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private get client(): VersePrismaClient {
    return this.dbService.client as unknown as VersePrismaClient;
  }

  // -----------------------------------------------------------------------
  // CRUD
  // -----------------------------------------------------------------------

  /**
   * Creates a published verse capturing one server instant.
   *
   * publishedAt is the full UTC instant. date is derived from that same
   * instant using America/Lima to produce the Peru business-day date.
   * The client DTO never includes date/time.
   */
  async create(dto: CreateVerseDto): Promise<VerseRow> {
    const now = new Date();
    const date = peruDateOnly(now);

    return this.client.verse.create({
      data: {
        text: dto.text,
        reference: dto.reference,
        publishedAt: now,
        date,
        status: "PUBLISHED",
      },
    });
  }

  /**
   * Hard deletes a verse by id.
   *
   * Deletes related revisions first to avoid FK constraint violations,
   * then removes the verse itself. Throws NotFoundException if the
   * verse does not exist.
   */
  async delete(id: string): Promise<void> {
    const existing = await this.client.verse.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Verse "${id}" not found`);
    }

    // FK uses ON DELETE CASCADE at the schema level; revision cleanup here
    // is a safe no-op if cascade already removed them.
    await this.client.verseRevision.deleteMany({ where: { verseId: id } });

    await this.client.verse.delete({ where: { id } });
  }

  /**
   * Returns the most recent PUBLISHED verse by publishedAt desc,
   * with id desc as deterministic tiebreaker.
   * Returns null if no published verses exist.
   */
  async getLatest(): Promise<VerseRow | null> {
    return this.client.verse.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    });
  }

  /**
   * Returns up to 100 previous PUBLISHED verses excluding the current latest.
   *
   * Ordered by publishedAt desc (newest first), id desc as
   * deterministic tiebreaker. Uses take:101 to ensure 100 history items
   * remain after filtering out the latest. Returns empty array when
   * 0 or 1 published verses exist.
   */
  async getHistory(): Promise<VerseRow[]> {
    const latest = await this.getLatest();
    if (!latest) return [];

    const all = await this.client.verse.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 101,
    });

    return all.filter((v) => v.id !== latest.id);
  }

  /**
   * Returns the most recent 200 verses for the admin listing (capped),
   * ordered by publishedAt desc, id desc as deterministic tiebreaker.
   */
  async findAll(): Promise<VerseRow[]> {
    return this.client.verse.findMany({
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 200,
    });
  }
}
