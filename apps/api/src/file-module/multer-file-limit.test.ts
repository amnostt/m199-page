/**
 * Multer file-size limit HTTP proof (FU-06).
 *
 * Proves that when Multer's memoryStorage with limits.fileSize = 10MB
 * receives a multipart upload exceeding the limit, it emits a
 * LIMIT_FILE_SIZE error — the same configuration used by the
 * FilesController's FileInterceptor decorator.
 *
 * The first test group exercises Multer at the HTTP level (multipart
 * streaming). The second test group sends a real supertest request through
 * the Nest FilesController route and FileInterceptor wiring.
 *
 * The test proves two things:
 * 1. Multer correctly rejects files > MAX_FILE_SIZE (10MB) at the
 *    HTTP middleware level with an error code of LIMIT_FILE_SIZE.
 * 2. The AllExceptionsFilter (tested separately) correctly maps
 *    LIMIT_FILE_SIZE → 413 Payload Too Large.
 */

import express from "express";
import multer from "multer";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import type { Server } from "http";
import { Test } from "@nestjs/testing";
import type { INestApplication, ExecutionContext } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { FilesController } from "./file.controller.js";
import { FileService } from "./file.service.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { AllExceptionsFilter } from "../common/filters/all-exceptions.filter.js";

const MAX_FILE_SIZE = 10485760; // 10MB — matches env default

function createApp(): express.Express {
  const app = express();

  // Configure Multer IDENTICALLY to the FilesController:
  // FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE }})
  // uses multer({ storage: multer.memoryStorage(), limits: { fileSize: ... }})
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
  });

  app.post(
    "/files/:category",
    upload.single("file"),
    (_req, res) => {
      // If we get here, Multer accepted the file.
      // In the real app, this would be the FilesController.upload handler.
      res.status(201).json({ ok: true });
    },
  );

  // Error-handling middleware — simulates what AllExceptionsFilter does:
  // maps MulterError → 413 and returns a JSON envelope.
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          statusCode: 413,
          message: "File too large",
        });
        return;
      }
      // Other errors → 500 (matching AllExceptionsFilter behavior)
      console.error("Unhandled error:", err);
      res.status(500).json({
        statusCode: 500,
        message: "Internal server error",
      });
    },
  );

  return app;
}

describe("Multer file-size limit HTTP proof (FU-06)", () => {
  let server: Server;

  beforeAll(async () => {
    const app = createApp();
    server = app.listen(0); // random port
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("returns 413 when file exceeds MAX_FILE_SIZE (10MB)", async () => {
    // 15MB buffer — exceeds the 10MB limit
    const bigBuffer = Buffer.alloc(15 * 1024 * 1024, 0x41);

    const res = await request(server)
      .post("/files/OUTING_MAIN_IMAGE")
      .attach("file", bigBuffer, {
        filename: "big-image.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(413);
    expect(res.body.statusCode).toBe(413);
    expect(res.body.message).toBe("File too large");
  });

  it("returns 413 for oversized PDF upload (triangulation — document category)", async () => {
    const bigBuffer = Buffer.alloc(15 * 1024 * 1024, 0x42);

    const res = await request(server)
      .post("/files/OUTING_CROQUIS")
      .attach("file", bigBuffer, {
        filename: "big-document.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(413);
    expect(res.body.statusCode).toBe(413);
  });

  it("returns 201 for file under the limit (safety — proves Multer allows valid uploads)", async () => {
    // 1KB file — well under the 10MB limit
    const smallBuffer = Buffer.from("fake image data under limit");

    const res = await request(server)
      .post("/files/OUTING_MAIN_IMAGE")
      .attach("file", smallBuffer, {
        filename: "small-image.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });
});

describe("FilesController route-level file-size limit (FU-06)", () => {
  let app: INestApplication;
  const fileService = {
    upload: vi.fn(),
    remove: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        { provide: FileService, useValue: fileService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<{
            user?: { id: string; email: string; displayName: string };
          }>();
          req.user = {
            id: "user-1",
            email: "user@example.com",
            displayName: "Test User",
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    // Vitest's esbuild transpilation does not emit constructor metadata for
    // ad-hoc test modules, so register the same production filter instance
    // explicitly while still exercising the real Nest route/interceptor path.
    app.useGlobalFilters(
      new AllExceptionsFilter(app.get(HttpAdapterHost)),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 413 through the real FilesController route when upload exceeds MAX_FILE_SIZE", async () => {
    const bigBuffer = Buffer.alloc(15 * 1024 * 1024, 0x43);

    const res = await request(app.getHttpServer())
      .post("/files/OUTING_MAIN_IMAGE")
      .attach("file", bigBuffer, {
        filename: "oversized-image.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(413);
    expect(res.body.statusCode).toBe(413);
    expect(res.body.message).toBe("File too large");
    expect(fileService.upload).not.toHaveBeenCalled();
  });
});
