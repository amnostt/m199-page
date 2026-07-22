/**
 * FileService unit tests (FU-01, FU-02, FU-03, FU-04, FU-05).
 *
 * Tests MIME validation, thumbnail success/fail, atomic rollback on DB
 * error, serve 404, serveThumb 404, and remove with ENOENT best-effort.
 *
 * Uses mocked DbService, vi.mock("sharp"), vi.mock("fs/promises"),
 * and a real tmpdir for file-system verification.
 */
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";
import path from "path";

// ---- hoisted mocks -------------------------------------------------------
const { mkdirMock, writeFileMock, unlinkMock, readFileMock } = vi.hoisted(
  () => ({
    mkdirMock: vi.fn().mockResolvedValue(undefined),
    writeFileMock: vi.fn().mockResolvedValue(undefined),
    unlinkMock: vi.fn().mockResolvedValue(undefined),
    readFileMock: vi.fn().mockResolvedValue(Buffer.from("fake-image")),
  }),
);

vi.mock("fs/promises", () => ({
  mkdir: mkdirMock,
  writeFile: writeFileMock,
  unlink: unlinkMock,
  readFile: readFileMock,
}));

const { sharpMock } = vi.hoisted(() => ({
  sharpMock: vi.fn().mockReturnThis(),
}));

vi.mock("sharp", () => ({
  default: sharpMock,
}));

// ---- imports after mocks -------------------------------------------------
import { FileService } from "./file.service.js";
import { DbService } from "../db/db.service.js";

// ---- test data -----------------------------------------------------------

interface FileAssetRow {
  id: string;
  storageProvider: "LOCAL";
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

const SAMPLE_IMAGE_ROW: FileAssetRow = {
  id: "file-1",
  storageProvider: "LOCAL",
  category: "OUTING_MAIN_IMAGE",
  originalFilename: "photo.jpg",
  mimeType: "image/jpeg",
  extension: ".jpg",
  fileSize: 2048,
  storagePath: "./uploads/OUTING_MAIN_IMAGE/f1.uuid.jpg",
  url: "/files/file-1",
  metadata: null,
  thumbnailPath: "./uploads/OUTING_MAIN_IMAGE/f1.uuid.jpg.thumb.jpg",
  uploadedById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const SAMPLE_DOC_ROW: FileAssetRow = {
  id: "file-2",
  storageProvider: "LOCAL",
  category: "OUTING_CROQUIS",
  originalFilename: "plan.pdf",
  mimeType: "application/pdf",
  extension: ".pdf",
  fileSize: 5120,
  storagePath: "./uploads/OUTING_CROQUIS/f2.uuid.pdf",
  url: "/files/file-2",
  metadata: null,
  thumbnailPath: null,
  uploadedById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const VALID_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const VALID_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const VALID_PDF = Buffer.from("%PDF-1.7\n");

// ---- helpers ------------------------------------------------------------

interface MockDbOverrides {
  findUniqueResult?: FileAssetRow | null;
  createResult?: FileAssetRow;
  deleteResult?: FileAssetRow;
}

function makeDbValue(overrides: MockDbOverrides = {}) {
  // Use Object.hasOwn to distinguish null (explicit override) from undefined (use default)
  const findUniqueReturn = Object.hasOwn(overrides, "findUniqueResult")
    ? overrides.findUniqueResult
    : SAMPLE_IMAGE_ROW;
  const createReturn = Object.hasOwn(overrides, "createResult")
    ? overrides.createResult
    : SAMPLE_IMAGE_ROW;
  const deleteReturn = Object.hasOwn(overrides, "deleteResult")
    ? overrides.deleteResult
    : SAMPLE_IMAGE_ROW;

  const findUnique = vi.fn().mockResolvedValue(findUniqueReturn);
  const create = vi.fn().mockResolvedValue(createReturn);
  const update = vi.fn().mockResolvedValue(SAMPLE_IMAGE_ROW);
  const _delete = vi.fn().mockResolvedValue(deleteReturn);

  const client = {
    fileAsset: { findUnique, create, update, delete: _delete },
  };

  return { client, findUnique, create, update, delete: _delete };
}

interface ServiceFixture {
  service: FileService;
  mocks: ReturnType<typeof makeDbValue>;
}

async function buildService(
  dbOverrides: MockDbOverrides = {},
): Promise<ServiceFixture> {
  const dbValue = makeDbValue(dbOverrides);

  const module = await Test.createTestingModule({
    providers: [FileService, { provide: DbService, useValue: dbValue }],
  }).compile();

  return {
    service: module.get(FileService),
    mocks: dbValue,
  };
}

// ---- tests ----------------------------------------------------------------

describe("FileService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["UPLOAD_DIR"] = "./uploads";
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    unlinkMock.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // upload — MIME validation (FU-05)
  // -------------------------------------------------------------------------

  describe("upload (FU-05 MIME validation)", () => {
    it("throws BadRequest when MIME is not allowed for image category", async () => {
      const { service } = await buildService();

      await expect(
        service.upload({
          buffer: Buffer.from("fake"),
          originalFilename: "evil.txt",
          mimeType: "text/plain",
          category: "OUTING_MAIN_IMAGE",
          uploadedById: "user-1",
        }),
      ).rejects.toThrow("MIME type text/plain is not allowed");
    });

    it("throws BadRequest when MIME is not allowed for document category", async () => {
      const { service } = await buildService();

      await expect(
        service.upload({
          buffer: Buffer.from("fake"),
          originalFilename: "evil.txt",
          mimeType: "text/plain",
          category: "OUTING_CROQUIS",
          uploadedById: "user-1",
        }),
      ).rejects.toThrow("MIME type text/plain is not allowed");
    });

    it("accepts image/jpeg for OUTING_MAIN_IMAGE", async () => {
      const { service, mocks } = await buildService({
        createResult: { ...SAMPLE_IMAGE_ROW, id: "new-file" },
      });

      await service.upload({
        buffer: VALID_JPEG,
        originalFilename: "photo.jpg",
        mimeType: "image/jpeg",
        category: "OUTING_MAIN_IMAGE",
        uploadedById: "user-1",
      });

      expect(mocks.create).toHaveBeenCalled();
    });

    it("rejects when declared MIME does not match file signature", async () => {
      const { service, mocks } = await buildService();

      await expect(
        service.upload({
          buffer: VALID_PDF,
          originalFilename: "not-a-photo.jpg",
          mimeType: "image/jpeg",
          category: "OUTING_MAIN_IMAGE",
          uploadedById: "user-1",
        }),
      ).rejects.toThrow("File content does not match MIME type image/jpeg");

      expect(writeFileMock).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    });

    it("accepts image/png for image category when signature matches", async () => {
      const { service, mocks } = await buildService({
        createResult: {
          ...SAMPLE_IMAGE_ROW,
          id: "new-png",
          mimeType: "image/png",
        },
      });

      await service.upload({
        buffer: VALID_PNG,
        originalFilename: "photo.png",
        mimeType: "image/png",
        category: "OUTING_MAIN_IMAGE",
        uploadedById: "user-1",
      });

      expect(mocks.create).toHaveBeenCalled();
    });

    it("accepts application/pdf for OUTING_CROQUIS (document category)", async () => {
      const { service, mocks } = await buildService({
        createResult: { ...SAMPLE_DOC_ROW, id: "new-doc" },
      });

      await service.upload({
        buffer: VALID_PDF,
        originalFilename: "plan.pdf",
        mimeType: "application/pdf",
        category: "OUTING_CROQUIS",
        uploadedById: "user-1",
      });

      expect(mocks.create).toHaveBeenCalled();
    });

    it("stores absolute paths under relative UPLOAD_DIR", async () => {
      const { service, mocks } = await buildService({
        createResult: { ...SAMPLE_DOC_ROW, id: "new-doc" },
      });

      await service.upload({
        buffer: VALID_PDF,
        originalFilename: "plan.pdf",
        mimeType: "application/pdf",
        category: "OUTING_CROQUIS",
        uploadedById: "user-1",
      });

      const createArg = mocks.create.mock.calls[0]?.[0];
      expect(createArg?.data.storagePath).toMatch(
        new RegExp(
          `^${path.resolve("./uploads").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        ),
      );
      expect(path.isAbsolute(createArg?.data.storagePath ?? "")).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // upload — thumbnail success (FU-04)
  // -------------------------------------------------------------------------

  describe("upload thumbnail generation (FU-04)", () => {
    it("calls sharp with resize(500, { fit: 'inside' }) for image MIME", async () => {
      const { service } = await buildService({
        createResult: { ...SAMPLE_IMAGE_ROW, id: "new-file" },
      });

      sharpMock.mockReturnThis();
      const resizeMock = vi.fn().mockReturnThis();
      const toFileMock = vi.fn().mockResolvedValue(undefined);
      sharpMock.mockImplementation(() => ({
        resize: resizeMock,
        toFile: toFileMock,
      }));

      await service.upload({
        buffer: VALID_JPEG,
        originalFilename: "photo.jpg",
        mimeType: "image/jpeg",
        category: "OUTING_MAIN_IMAGE",
        uploadedById: "user-1",
      });

      expect(resizeMock).toHaveBeenCalledWith({ width: 500, fit: "inside" });
    });

    it("does NOT call sharp for application/pdf", async () => {
      const { service } = await buildService({
        createResult: { ...SAMPLE_DOC_ROW, id: "new-doc" },
      });

      await service.upload({
        buffer: VALID_PDF,
        originalFilename: "plan.pdf",
        mimeType: "application/pdf",
        category: "OUTING_CROQUIS",
        uploadedById: "user-1",
      });

      expect(sharpMock).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // upload — thumbnail failure non-fatal (FU-04)
  // -------------------------------------------------------------------------

  describe("upload thumbnail failure (FU-04)", () => {
    it("still creates DB record when thumbnail generation fails for a valid image", async () => {
      const { service, mocks } = await buildService({
        createResult: {
          ...SAMPLE_IMAGE_ROW,
          thumbnailPath: null,
          id: "new-file",
        },
      });

      sharpMock.mockImplementation(() => {
        throw new Error("Sharp error");
      });

      await service.upload({
        buffer: VALID_JPEG,
        originalFilename: "photo.jpg",
        mimeType: "image/jpeg",
        category: "OUTING_MAIN_IMAGE",
        uploadedById: "user-1",
      });

      // DB record should still be created with thumbnailPath = null
      expect(mocks.create).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // upload — atomic rollback on DB error (FU-01)
  // -------------------------------------------------------------------------

  describe("upload atomic rollback (FU-01)", () => {
    it("unlinks the file when DB insert fails", async () => {
      const { service, mocks } = await buildService();

      mocks.create.mockRejectedValue(new Error("DB error"));

      await expect(
        service.upload({
          buffer: VALID_JPEG,
          originalFilename: "photo.jpg",
          mimeType: "image/jpeg",
          category: "OUTING_MAIN_IMAGE",
          uploadedById: "user-1",
        }),
      ).rejects.toThrow("DB error");

      // Original file should be unlinked (rollback)
      expect(unlinkMock).toHaveBeenCalled();
    });

    it("deletes created DB row and unlinks files when URL update fails", async () => {
      const { service, mocks } = await buildService({
        createResult: { ...SAMPLE_IMAGE_ROW, id: "created-file" },
      });

      const updateError = new Error("DB update error");
      mocks.update.mockRejectedValue(updateError);

      await expect(
        service.upload({
          buffer: VALID_JPEG,
          originalFilename: "photo.jpg",
          mimeType: "image/jpeg",
          category: "OUTING_MAIN_IMAGE",
          uploadedById: "user-1",
        }),
      ).rejects.toThrow(updateError);

      expect(unlinkMock).toHaveBeenCalled();
      expect(mocks.delete).toHaveBeenCalledWith({
        where: { id: "created-file" },
      });
    });
  });

  // -------------------------------------------------------------------------
  // serve — 404 on miss (FU-02)
  // -------------------------------------------------------------------------

  describe("serve (FU-02)", () => {
    it("throws NotFoundException when file record does not exist", async () => {
      const { service } = await buildService({ findUniqueResult: null });

      await expect(service.serve("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("returns { path, mimeType } on success", async () => {
      const { service } = await buildService({
        findUniqueResult: SAMPLE_IMAGE_ROW,
      });

      const result = await service.serve("file-1");

      expect(result).toEqual({
        path: path.resolve(SAMPLE_IMAGE_ROW.storagePath),
        mimeType: SAMPLE_IMAGE_ROW.mimeType,
      });
    });

    it("throws NotFoundException for storagePath outside upload root", async () => {
      const { service } = await buildService({
        findUniqueResult: { ...SAMPLE_IMAGE_ROW, storagePath: "/etc/passwd" },
      });

      await expect(service.serve("escaped")).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // serveThumb — 404 on miss or null thumbnailPath (FU-04)
  // -------------------------------------------------------------------------

  describe("serveThumb (FU-04)", () => {
    it("throws NotFoundException when file record does not exist", async () => {
      const { service } = await buildService({ findUniqueResult: null });

      await expect(service.serveThumb("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws NotFoundException when thumbnailPath is null (non-image)", async () => {
      const { service } = await buildService({
        findUniqueResult: SAMPLE_DOC_ROW,
      });

      await expect(service.serveThumb("file-2")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("returns { path, mimeType: 'image/jpeg' } on success", async () => {
      const { service } = await buildService({
        findUniqueResult: SAMPLE_IMAGE_ROW,
      });

      const result = await service.serveThumb("file-1");

      expect(result).toEqual({
        path: path.resolve(SAMPLE_IMAGE_ROW.thumbnailPath ?? ""),
        mimeType: "image/jpeg",
      });
    });
  });

  // -------------------------------------------------------------------------
  // remove — best-effort unlink (FU-03)
  // -------------------------------------------------------------------------

  describe("remove (FU-03)", () => {
    it("deletes DB record and unlinks both file and thumbnail", async () => {
      const { service, mocks } = await buildService({
        findUniqueResult: SAMPLE_IMAGE_ROW,
      });

      await service.remove("file-1");

      expect(mocks.delete).toHaveBeenCalledWith({ where: { id: "file-1" } });
      // Both original and thumbnail should be unlinked
      expect(unlinkMock).toHaveBeenCalledTimes(2);
    });

    it("still deletes DB record when unlink throws ENOENT", async () => {
      const { service, mocks } = await buildService({
        findUniqueResult: SAMPLE_IMAGE_ROW,
      });

      unlinkMock.mockRejectedValue(new Error("ENOENT: no such file"));

      // Should not throw — best-effort
      await expect(service.remove("file-1")).resolves.toBeUndefined();
      expect(mocks.delete).toHaveBeenCalled();
    });

    it("prevents unlink and DB delete when storagePath is outside upload root", async () => {
      const { service, mocks } = await buildService({
        findUniqueResult: { ...SAMPLE_IMAGE_ROW, storagePath: "/etc/passwd" },
      });

      await expect(service.remove("escaped")).rejects.toThrow(
        NotFoundException,
      );
      expect(unlinkMock).not.toHaveBeenCalled();
      expect(mocks.delete).not.toHaveBeenCalled();
    });

    it("does not unlink physical files when DB delete fails", async () => {
      const { service, mocks } = await buildService({
        findUniqueResult: SAMPLE_IMAGE_ROW,
      });
      mocks.delete.mockRejectedValue(new Error("DB delete error"));

      await expect(service.remove("file-1")).rejects.toThrow("DB delete error");

      expect(unlinkMock).not.toHaveBeenCalled();
    });

    it("unlinks absolute paths stored under relative UPLOAD_DIR", async () => {
      const storagePath = path.resolve(
        "./uploads/OUTING_MAIN_IMAGE/f1.uuid.jpg",
      );
      const thumbnailPath = `${storagePath}.thumb.jpg`;
      const { service } = await buildService({
        findUniqueResult: { ...SAMPLE_IMAGE_ROW, storagePath, thumbnailPath },
      });

      await service.remove("file-1");

      expect(unlinkMock).toHaveBeenCalledWith(storagePath);
      expect(unlinkMock).toHaveBeenCalledWith(thumbnailPath);
    });

    it("throws NotFoundException when file record does not exist", async () => {
      const { service } = await buildService({ findUniqueResult: null });

      await expect(service.remove("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
