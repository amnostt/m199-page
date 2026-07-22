/**
 * FilesPublicController — public file serving (FU-02, FU-04).
 *
 * Serves uploaded files via GET /files/:id and GET /files/:id/thumb
 * as binary data with the correct Content-Type from the DB row.
 * No auth guard — files are public by design (FU-07).
 * Returns JSON 404 envelope via NotFoundException (FU-02).
 */
import {
  Controller,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { stat } from "fs/promises";
import path from "path";
import { FileService } from "./file.service.js";

@Controller("files")
export class FilesPublicController {
  private readonly logger = new Logger(FilesPublicController.name);

  constructor(@Inject(FileService) private readonly fileService: FileService) {}

  /**
   * Serves the original file as binary data (FU-02).
   *
   * Looks up storagePath from DB, verifies file existence on disk,
   * and streams the file with the correct Content-Type header.
   * Returns 404 JSON envelope when file/record does not exist.
   */
  @Get(":id")
  async serve(@Param("id") id: string, @Res() res: Response): Promise<void> {
    const file = await this.fileService.serve(id);
    const filePath = this.resolveInsideUploadRoot(file.path);

    // Verify the physical file exists before attempting sendFile
    try {
      await stat(filePath);
    } catch (err) {
      if (!this.isNotFoundError(err)) {
        this.logger.warn({ err, filePath }, "Failed to stat file");
      }
      throw new NotFoundException("File not found");
    }

    res.setHeader("Content-Type", file.mimeType);
    await this.sendFile(res, filePath);
  }

  /**
   * Serves the thumbnail for image files (FU-04).
   *
   * Returns 404 JSON envelope when file has no thumbnail (non-image)
   * or record does not exist.
   */
  @Get(":id/thumb")
  async serveThumb(
    @Param("id") id: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.fileService.serveThumb(id);
    const filePath = this.resolveInsideUploadRoot(file.path);

    try {
      await stat(filePath);
    } catch (err) {
      if (!this.isNotFoundError(err)) {
        this.logger.warn({ err, filePath }, "Failed to stat file");
      }
      throw new NotFoundException("File not found");
    }

    res.setHeader("Content-Type", file.mimeType);
    await this.sendFile(res, filePath);
  }

  private resolveInsideUploadRoot(filePath: string): string {
    const root = path.resolve(process.env["UPLOAD_DIR"] ?? "./uploads");
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

  private async sendFile(res: Response, filePath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      res.sendFile(filePath, (err) => {
        if (err) {
          this.logger.warn({ err, filePath }, "Failed to send file");
          reject(new NotFoundException("File not found"));
          return;
        }
        resolve();
      });
    });
  }

  private isNotFoundError(err: unknown): boolean {
    return Boolean(
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "ENOENT",
    );
  }
}
