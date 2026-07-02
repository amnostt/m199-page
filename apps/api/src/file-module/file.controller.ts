/**
 * FilesController — authenticated file upload and deletion (FU-01, FU-03, FU-07).
 *
 * POST /files/:category — requires AuthGuard (ACTIVE user).
 *   Uses FileInterceptor with MAX_FILE_SIZE limit (FU-06).
 *   Validates MIME type via FileService.upload (FU-05).
 *
 * DELETE /files/:id — requires AuthGuard (ACTIVE user).
 *   Removes file from disk and DB record (FU-03).
 *
 * Both endpoints are behind AuthGuard at controller level.
 * GET endpoints are handled by FilesPublicController (no auth, FU-07).
 */
import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { AuthGuard } from "../auth/auth.guard.js";
import { FileService } from "./file.service.js";
import type { FileAssetResponse } from "./dto/file-response.dto.js";
import type { AuthenticatedUser } from "../auth/auth.guard.js";
import { isFileCategory } from "./file-category.js";

@Controller("files")
@UseGuards(AuthGuard)
export class FilesController {
  constructor(
    @Inject(FileService) private readonly fileService: FileService,
  ) {}

  /**
   * Upload a file (FU-01, FU-05, FU-06, FU-07).
   *
   * Accepts multipart/form-data with a `file` field.
   * AuthGuard ensures the user is authenticated and ACTIVE.
   * FileInterceptor enforces MAX_FILE_SIZE (FU-06).
   * FileService.upload validates MIME type against category allowlist (FU-05).
   *
   * Returns 201 with FileAssetResponse on success.
   */
  @Post(":category")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: Number(process.env["MAX_FILE_SIZE"]) || 10485760 } }))
  async upload(
    @Param("category") category: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ): Promise<FileAssetResponse> {
    if (!isFileCategory(category)) {
      throw new BadRequestException("Invalid file category");
    }
    if (!file) {
      throw new BadRequestException("File is required");
    }

    const user = (req as Request & { user?: AuthenticatedUser }).user;
    return this.fileService.upload({
      buffer: file.buffer,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      category,
      uploadedById: user?.id,
    });
  }

  /**
   * Delete a file (FU-03, FU-07).
   *
   * AuthGuard ensures the user is authenticated and ACTIVE.
   * Removes both the physical file (original + thumbnail) and the DB record.
   * Best-effort file deletion — returns 204 even if unlink partially fails.
   *
   * Returns 204 on success.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id") id: string,
  ): Promise<{ statusCode: number }> {
    await this.fileService.remove(id);
    return { statusCode: HttpStatus.NO_CONTENT };
  }
}
