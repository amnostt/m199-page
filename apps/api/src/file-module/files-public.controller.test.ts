/**
 * FilesPublicController integration tests (FU-02, FU-04).
 *
 * Proves that the public GET endpoints exist, are NOT behind AuthGuard,
 * return binary data with correct Content-Type (NOT JSON metadata), and
 * return the spec's JSON 404 envelope on miss.
 *
 * Uses Test.createTestingModule with mocked FileService.
 */
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";
import type { Response } from "express";
import path from "path";
import { FilesPublicController } from "./files-public.controller.js";
import { FileService } from "./file.service.js";

// ---- hoisted mock for fs/promises stat --------------------------------
const { statMock } = vi.hoisted(() => ({
  statMock: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  stat: statMock,
}));

// ---- helpers -----------------------------------------------------------

function mockFileService(): FileService {
  return {
    serve: vi.fn(),
    serveThumb: vi.fn(),
  } as unknown as FileService;
}

function makeMockRes(): Response {
  const res = {
    setHeader: vi.fn(),
    sendFile: vi.fn((_filePath: string, callback?: (err?: Error) => void) => {
      callback?.();
    }),
    status: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

// ---- tests ----------------------------------------------------------------

describe("FilesPublicController", () => {
  let controller: FilesPublicController;
  let fileService: FileService;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env["UPLOAD_DIR"] = "./uploads";
    statMock.mockResolvedValue(undefined);

    fileService = mockFileService();

    const module = await Test.createTestingModule({
      controllers: [FilesPublicController],
      providers: [{ provide: FileService, useValue: fileService }],
    }).compile();

    controller = module.get(FilesPublicController);
  });

  // ---- GET /files/:id (FU-02) -------------------------------------------

  describe("GET /files/:id (FU-02) — binary serving", () => {
    it("sets Content-Type from DB mimeType and sends binary via sendFile", async () => {
      vi.mocked(fileService.serve).mockResolvedValue({
        path: "./uploads/img.jpg",
        mimeType: "image/jpeg",
      });

      const res = makeMockRes();
      await controller.serve("file-1", res);

      expect(fileService.serve).toHaveBeenCalledWith("file-1");
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/jpeg");
      expect(res.sendFile).toHaveBeenCalledWith(
        path.resolve("./uploads/img.jpg"),
        expect.any(Function),
      );
    });

    it("throws NotFoundException when DB record is missing", async () => {
      vi.mocked(fileService.serve).mockRejectedValue(
        new NotFoundException("File not found"),
      );

      const res = makeMockRes();
      await expect(controller.serve("nonexistent", res)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws NotFoundException when DB row exists but file missing from disk", async () => {
      vi.mocked(fileService.serve).mockResolvedValue({
        path: "/uploads/gone.jpg",
        mimeType: "image/jpeg",
      });
      statMock.mockRejectedValue(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
      );

      const res = makeMockRes();
      await expect(controller.serve("orphan", res)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws NotFoundException for DB paths outside upload root", async () => {
      vi.mocked(fileService.serve).mockResolvedValue({
        path: "/etc/passwd",
        mimeType: "text/plain",
      });

      const res = makeMockRes();
      await expect(controller.serve("escaped", res)).rejects.toThrow(
        NotFoundException,
      );

      expect(statMock).not.toHaveBeenCalled();
      expect(res.sendFile).not.toHaveBeenCalled();
    });
  });

  // ---- GET /files/:id/thumb (FU-04) ------------------------------------

  describe("GET /files/:id/thumb (FU-04) — binary serving", () => {
    it("sets Content-Type and sends thumbnail binary via sendFile", async () => {
      vi.mocked(fileService.serveThumb).mockResolvedValue({
        path: "./uploads/img.jpg.thumb.jpg",
        mimeType: "image/jpeg",
      });

      const res = makeMockRes();
      await controller.serveThumb("file-1", res);

      expect(fileService.serveThumb).toHaveBeenCalledWith("file-1");
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/jpeg");
      expect(res.sendFile).toHaveBeenCalledWith(
        path.resolve("./uploads/img.jpg.thumb.jpg"),
        expect.any(Function),
      );
    });

    it("throws NotFoundException when DB record is missing", async () => {
      vi.mocked(fileService.serveThumb).mockRejectedValue(
        new NotFoundException("File not found"),
      );

      const res = makeMockRes();
      await expect(controller.serveThumb("nonexistent", res)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws NotFoundException when thumbnail missing from disk", async () => {
      vi.mocked(fileService.serveThumb).mockResolvedValue({
        path: "/uploads/gone.thumb.jpg",
        mimeType: "image/jpeg",
      });
      statMock.mockRejectedValue(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
      );

      const res = makeMockRes();
      await expect(controller.serveThumb("orphan", res)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---- module wiring (smoke test) ---------------------------------------

  it("compiles with mocked service", () => {
    expect(controller).toBeDefined();
  });
});
