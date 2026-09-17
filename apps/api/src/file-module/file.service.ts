/**
 * FileService — upload, serve, serveThumb, and remove (FU-01–FU-05).
 *
 * Owns all disk I/O: mkdir, writeFile, sharp thumbnail, and unlink.
 * Uses DbService to interact with FileAsset records.
 * Thumbnail failures are non-fatal (FU-04) — original is preserved.
 * Upload rolls back files and created metadata on DB error (FU-01).
 * Remove deletes metadata before best-effort unlink (FU-03).
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import { DbService } from "../db/db.service.js";
import {
  FileCategory,
  isAllowedMime,
  isFileCategory,
} from "./file-category.js";
import type { FileAssetResponse } from "./dto/file-response.dto.js";
import { randomUUID } from "crypto";
import path from "path";

const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_LANDING_FEATURED_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_LANDING_BACKGROUND_MUSIC_BYTES = 10 * 1024 * 1024;

const MP4_BRANDS = new Set([
  "isom",
  "iso2",
  "iso3",
  "iso4",
  "iso5",
  "iso6",
  "mp41",
  "mp42",
  "mp71",
  "mp72",
  "mp81",
  "avc1",
  "M4V ",
  "M4A ",
  "M4B ",
  "M4P ",
  "M4H ",
  "M4F ",
  "3gp4",
  "3gp5",
  "3gp6",
  "3g2a",
  "3g2b",
  "F4V ",
  "F4A ",
  "F4B ",
]);

function hasMp4FtypSignature(buffer: Buffer): boolean {
  if (buffer.length < 16) return false;

  const boxSize = buffer.readUInt32BE(0);
  const boxType = buffer.subarray(4, 8).toString("ascii");
  if (boxType !== "ftyp") return false;

  let brandOffset = 8;
  let boxEnd = boxSize === 0 ? buffer.length : boxSize;
  if (boxSize === 1) {
    if (buffer.length < 24) return false;
    const largeSize = Number(buffer.readBigUInt64BE(8));
    if (!Number.isSafeInteger(largeSize)) return false;
    boxEnd = largeSize;
    brandOffset = 16;
  }

  if (boxEnd < brandOffset + 8 || boxEnd > buffer.length) return false;
  if ((boxEnd - brandOffset) % 4 !== 0) return false;
  if (
    MP4_BRANDS.has(
      buffer.subarray(brandOffset, brandOffset + 4).toString("ascii"),
    )
  ) {
    return true;
  }

  for (let offset = brandOffset + 8; offset + 4 <= boxEnd; offset += 4) {
    const brand = buffer.subarray(offset, offset + 4).toString("ascii");
    if (MP4_BRANDS.has(brand)) return true;
  }

  return false;
}

function hasMp3Signature(buffer: Buffer): boolean {
  let frameOffset = 0;

  if (buffer.subarray(0, 3).equals(Buffer.from("ID3"))) {
    if (buffer.length < 10) return false;

    const version = buffer[3];
    const flags = buffer[5];
    const sizeBytes = buffer.subarray(6, 10);
    const size0 = sizeBytes[0];
    const size1 = sizeBytes[1];
    const size2 = sizeBytes[2];
    const size3 = sizeBytes[3];
    const reservedFlagsMask = version === 4 ? 0x0f : 0x1f;
    if (
      version === undefined ||
      version < 2 ||
      version > 4 ||
      flags === undefined ||
      (flags & reservedFlagsMask) !== 0 ||
      size0 === undefined ||
      size1 === undefined ||
      size2 === undefined ||
      size3 === undefined ||
      sizeBytes.some((byte) => byte >= 0x80)
    ) {
      return false;
    }

    const tagSize = (size0 << 21) | (size1 << 14) | (size2 << 7) | size3;
    const footerSize = (flags & 0x10) === 0 ? 0 : 10;
    frameOffset = 10 + tagSize + footerSize;
    if (frameOffset > buffer.length) return false;
  }

  if (frameOffset + 4 > buffer.length) return false;
  const first = buffer[frameOffset];
  const second = buffer[frameOffset + 1];
  const third = buffer[frameOffset + 2];
  const fourth = buffer[frameOffset + 3];
  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    fourth === undefined
  ) {
    return false;
  }

  const versionBits = (second >> 3) & 0x03;
  const layerBits = (second >> 1) & 0x03;
  const bitrateIndex = (third >> 4) & 0x0f;
  const sampleRateIndex = (third >> 2) & 0x03;
  const hasFrameSync = first === 0xff && (second & 0xe0) === 0xe0;
  if (
    !hasFrameSync ||
    versionBits === 1 ||
    layerBits === 0 ||
    bitrateIndex === 0 ||
    bitrateIndex === 15 ||
    sampleRateIndex === 3
  ) {
    return false;
  }

  const bitrateTables = {
    mpeg1: [
      [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
      [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
      [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
    ],
    mpeg2: [
      [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
      [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
      [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    ],
  } as const;
  const sampleRates = [44100, 48000, 32000];
  const isMpeg1 = versionBits === 3;
  const versionTable = isMpeg1 ? bitrateTables.mpeg1 : bitrateTables.mpeg2;
  const layerIndex = 3 - layerBits;
  const bitrate = versionTable[layerIndex]?.[bitrateIndex];
  const baseSampleRate = sampleRates[sampleRateIndex];
  const sampleRate =
    baseSampleRate === undefined
      ? undefined
      : isMpeg1
        ? baseSampleRate
        : versionBits === 2
          ? baseSampleRate / 2
          : baseSampleRate / 4;
  if (bitrate === undefined || sampleRate === undefined) return false;

  const padding = (third >> 1) & 0x01;
  const frameLength =
    layerBits === 3
      ? Math.floor((12 * bitrate * 1000) / sampleRate + padding) * 4
      : Math.floor(
          ((isMpeg1 || layerBits === 2 ? 144 : 72) * bitrate * 1000) /
            sampleRate +
            padding,
        );
  return frameOffset + frameLength <= buffer.length;
}

// ---------------------------------------------------------------------------
// Minimal Prisma-model interfaces
// ---------------------------------------------------------------------------

interface FileAssetRow {
  id: string;
  storageProvider: string;
  category: string;
  originalFilename: string;
  mimeType: string;
  extension: string | null;
  fileSize: number;
  storagePath: string;
  url: string;
  metadata: unknown | null;
  thumbnailPath: string | null;
  uploadedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FileAssetCreateInput {
  storageProvider?: string;
  category: string;
  originalFilename: string;
  mimeType: string;
  extension: string | null;
  fileSize: number;
  storagePath: string;
  url: string;
  metadata?: unknown | null;
  thumbnailPath?: string | null;
  uploadedById?: string | null;
}

interface FilePrismaClient {
  fileAsset: {
    findUnique(args: { where: { id: string } }): Promise<FileAssetRow | null>;
    create(args: { data: FileAssetCreateInput }): Promise<FileAssetRow>;
    update(args: {
      where: { id: string };
      data: { url: string };
    }): Promise<FileAssetRow>;
    delete(args: { where: { id: string } }): Promise<FileAssetRow>;
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Casts DbService.client to the minimal Prisma interface this service needs. */
  private get client(): FilePrismaClient {
    return this.dbService.client as unknown as FilePrismaClient;
  }

  // -----------------------------------------------------------------------
  // upload — FU-01, FU-04, FU-05
  // -----------------------------------------------------------------------

  /**
   * Validates MIME, writes file to disk, generates thumbnail (if image),
   * inserts FileAsset record, and rolls back the file on DB failure.
   */
  async upload(params: {
    buffer: Buffer;
    originalFilename: string;
    mimeType: string;
    category: FileCategory;
    uploadedById?: string;
  }): Promise<FileAssetResponse> {
    const { buffer, originalFilename, mimeType, category, uploadedById } =
      params;

    if (!isFileCategory(category)) {
      throw new BadRequestException("Invalid file category");
    }

    // FU-05: validate MIME type
    if (!isAllowedMime(category, mimeType)) {
      throw new BadRequestException(
        `MIME type ${mimeType} is not allowed for category ${category}`,
      );
    }

    const maxSize =
      category === FileCategory.LANDING_FEATURED_VIDEO
        ? MAX_LANDING_FEATURED_VIDEO_BYTES
        : category === FileCategory.LANDING_BACKGROUND_MUSIC
          ? MAX_LANDING_BACKGROUND_MUSIC_BYTES
          : Number(process.env["MAX_FILE_SIZE"]) || DEFAULT_MAX_FILE_SIZE_BYTES;
    if (buffer.length > maxSize) {
      throw new PayloadTooLargeException("File too large");
    }

    this.assertMagicBytesMatchMime(buffer, mimeType);

    if (category === FileCategory.LANDING_BACKGROUND_MUSIC) {
      const extension = path.extname(originalFilename).toLowerCase();
      if (extension !== ".mp3") {
        throw new BadRequestException(
          "Landing background music must use .mp3 extension",
        );
      }
    }

    const ext = this.extFromMime(mimeType);
    const uuid = randomUUID();
    const storagePath = path.join(this.uploadRoot(), category, `${uuid}${ext}`);
    const thumbnailPath = `${storagePath}.thumb.jpg`;

    // Write file to disk
    await this.mkdirForFile(storagePath);
    await this.writeFile(storagePath, buffer);

    // Generate thumbnail for images (FU-04) — non-fatal
    let thumbnailWritten: string | null = null;
    if (mimeType.startsWith("image/")) {
      try {
        await this.generateThumbnail(buffer, thumbnailPath);
        thumbnailWritten = thumbnailPath;
      } catch (err) {
        this.logger.warn({ err, storagePath }, "Failed to generate thumbnail");
        // Thumbnail failure is non-fatal — original is preserved
        thumbnailWritten = null;
      }
    }

    // Insert DB record
    let createdRowId: string | null = null;
    try {
      const row = await this.client.fileAsset.create({
        data: {
          storageProvider: "LOCAL",
          category,
          originalFilename,
          mimeType,
          extension: ext,
          fileSize: buffer.length,
          storagePath,
          url: `/files/${category}/${uuid}${ext}`, // temp; updated below
          metadata: null,
          thumbnailPath: thumbnailWritten,
          uploadedById: uploadedById ?? null,
        },
      });
      createdRowId = row.id;

      // Now that we have the id, update the URL to the canonical form
      const url = `/files/${row.id}`;
      await this.client.fileAsset.update({
        where: { id: row.id },
        data: { url },
      });

      return {
        id: row.id,
        url,
        thumbnailUrl: thumbnailWritten ? `/files/${row.id}/thumb` : null,
        mimeType: row.mimeType,
        fileSize: row.fileSize,
        originalFilename: row.originalFilename,
        category: row.category as FileCategory,
        createdAt: row.createdAt.toISOString(),
      };
    } catch (err) {
      // Rollback: unlink the file we just wrote (FU-01)
      await this.unlinkBestEffort(storagePath);
      if (thumbnailWritten) {
        await this.unlinkBestEffort(thumbnailWritten);
      }
      if (createdRowId) {
        await this.deleteDbRowBestEffort(createdRowId);
      }
      throw err;
    }
  }

  // -----------------------------------------------------------------------
  // serve — FU-02
  // -----------------------------------------------------------------------

  /** Returns { path, mimeType } for the given file id. Throws 404 on miss. */
  async serve(id: string): Promise<{ path: string; mimeType: string }> {
    const row = await this.client.fileAsset.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("File not found");
    }
    return {
      path: this.resolveInsideUploadRoot(row.storagePath),
      mimeType: row.mimeType,
    };
  }

  // -----------------------------------------------------------------------
  // serveThumb — FU-04
  // -----------------------------------------------------------------------

  /** Returns { path, mimeType } for the thumbnail. Throws 404 on miss or null. */
  async serveThumb(id: string): Promise<{ path: string; mimeType: string }> {
    const row = await this.client.fileAsset.findUnique({ where: { id } });
    if (!row || !row.thumbnailPath) {
      throw new NotFoundException("File not found");
    }
    return {
      path: this.resolveInsideUploadRoot(row.thumbnailPath),
      mimeType: "image/jpeg",
    };
  }

  // -----------------------------------------------------------------------
  // remove — FU-03
  // -----------------------------------------------------------------------

  /**
   * Deletes DB record before best-effort unlink of file and thumbnail.
   */
  async remove(id: string): Promise<void> {
    const row = await this.client.fileAsset.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("File not found");
    }

    const storagePath = this.resolveInsideUploadRoot(row.storagePath);
    const thumbnailPath = row.thumbnailPath
      ? this.resolveInsideUploadRoot(row.thumbnailPath)
      : null;

    await this.client.fileAsset.delete({ where: { id } });

    // Best-effort unlink after DB metadata is removed (FU-03)
    await this.unlinkBestEffort(storagePath);
    if (thumbnailPath) {
      await this.unlinkBestEffort(thumbnailPath);
    }
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private extFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "application/pdf": ".pdf",
      "video/mp4": ".mp4",
      "audio/mpeg": ".mp3",
    };
    return map[mimeType] ?? "";
  }

  private assertMagicBytesMatchMime(buffer: Buffer, mimeType: string): void {
    const matches = (() => {
      switch (mimeType) {
        case "image/jpeg":
          return (
            buffer.length >= 3 &&
            buffer[0] === 0xff &&
            buffer[1] === 0xd8 &&
            buffer[2] === 0xff
          );
        case "image/png":
          return (
            buffer.length >= 8 &&
            buffer
              .subarray(0, 8)
              .equals(
                Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
              )
          );
        case "image/gif":
          return (
            buffer.length >= 6 &&
            (buffer.subarray(0, 6).equals(Buffer.from("GIF87a")) ||
              buffer.subarray(0, 6).equals(Buffer.from("GIF89a")))
          );
        case "image/webp":
          return (
            buffer.length >= 12 &&
            buffer.subarray(0, 4).equals(Buffer.from("RIFF")) &&
            buffer.subarray(8, 12).equals(Buffer.from("WEBP"))
          );
        case "application/pdf":
          return (
            buffer.length >= 5 &&
            buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))
          );
        case "video/mp4":
          return hasMp4FtypSignature(buffer);
        case "audio/mpeg":
          return hasMp3Signature(buffer);
        default:
          return false;
      }
    })();

    if (!matches) {
      throw new BadRequestException(
        `File content does not match MIME type ${mimeType}`,
      );
    }
  }

  private async mkdirForFile(filePath: string): Promise<void> {
    const { mkdir } = await import("fs/promises");
    const dir = path.dirname(filePath);
    await mkdir(dir, { recursive: true });
  }

  private async writeFile(path: string, buffer: Buffer): Promise<void> {
    const { writeFile } = await import("fs/promises");
    await writeFile(path, buffer);
  }

  private async generateThumbnail(
    buffer: Buffer,
    outputPath: string,
  ): Promise<void> {
    const sharp = (await import("sharp")).default;
    await sharp(buffer)
      .resize({ width: 500, fit: "inside" })
      .toFile(outputPath);
  }

  private async unlinkBestEffort(path: string): Promise<void> {
    try {
      const { unlink } = await import("fs/promises");
      await unlink(path);
    } catch (err: unknown) {
      // Best-effort — log warning on ENOENT but continue
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code !== "ENOENT"
      ) {
        this.logger.warn({ err, path }, "Failed to unlink file");
      }
    }
  }

  private async deleteDbRowBestEffort(id: string): Promise<void> {
    try {
      await this.client.fileAsset.delete({ where: { id } });
    } catch (err) {
      this.logger.warn(
        { err, id },
        "Failed to delete rolled-back file metadata",
      );
    }
  }

  private uploadRoot(): string {
    return path.resolve(process.env["UPLOAD_DIR"] ?? "./uploads");
  }

  private resolveInsideUploadRoot(filePath: string): string {
    const root = this.uploadRoot();
    const resolvedPath = path.resolve(filePath);
    const relativeToRoot = path.relative(root, resolvedPath);

    if (
      relativeToRoot === "" ||
      (!relativeToRoot.startsWith("..") && !path.isAbsolute(relativeToRoot))
    ) {
      return resolvedPath;
    }

    this.logger.warn({ filePath }, "Rejected file path outside upload root");
    throw new NotFoundException("File not found");
  }
}
