import type { Request } from "express";
import type { DiskStorageOptions, StorageEngine } from "multer";

import type { FileProcessingHandler } from "@/utilities/file-processing";

import { getDestination, getFilename } from "@/utilities/file-processing";
import { inMemoryStorage } from "@/utilities/in-memory-storage";
import { MemoryWritable } from "@/utilities/memory-writable";

export type HandleFile = (
  request: Request,
  file: Express.Multer.File,
  callback: (error?: any, info?: Partial<Express.Multer.File>) => void
) => void;

export type RemoveFile = (
  request: Request,
  file: Express.Multer.File,
  callback: (error: Error | null) => void
) => void;

/**
 * Mock for `multer` storage engine.
 *
 * This mock is used to simulate file uploads in tests without actually writing files to disk.
 *
 * @class FakeMulterStorage
 * @implements {StorageEngine}
 * @param {DiskStorageOptions} [options] - Options for the storage engine.
 *
 * @example
 *
 * ```ts
 * /////////////////////////////////
 * // JEST MOCK EXAMPLE
 * /////////////////////////////////
 *
 * jest.mock("multer", () => {
 *     type Multer = typeof import("multer");
 *     const originalModule = jest.requireActual<Multer>("multer");
 *
 *     type MulterStorage = typeof import("@ibnlanre/multer");
 *     const { FakeMulterStorage } = jest.requireActual<MulterStorage>("@ibnlanre/multer");
 *
 *     return {
 *         __esModule: true,
 *         ...originalModule,
 *         default: jest.fn((options) => {
 *             return originalModule(options);
 *         }),
 *         diskStorage: jest.fn((options: multer.DiskStorageOptions) => {
 *             return new FakeMulterStorage(options);
 *         }),
 *         memoryStorage: jest.fn(() => {
 *             return new FakeMulterStorage();
 *         }),
 *     }
 * });
 *
 * /////////////////////////////////
 * // VITEST MOCK EXAMPLE
 * /////////////////////////////////
 *
 * vi.mock("multer", async (importOriginal) => {
 *     type Multer = typeof import("multer");
 *     const originalModule = await importOriginal<Multer>();
 *
 *     type MulterStorage = typeof import("@ibnlanre/multer");
 *     const { FakeMulterStorage } = await vi.importActual<MulterStorage>("@ibnlanre/multer");
 *
 *     return {
 *         __esModule: true,
 *         ...originalModule,
 *         default: vi.fn((options) => {
 *             return originalModule(options);
 *         }),
 *         diskStorage: vi.fn((options: multer.DiskStorageOptions) => {
 *             return new FakeMulterStorage(options);
 *         }),
 *         memoryStorage: vi.fn(() => {
 *             return new FakeMulterStorage();
 *         }),
 *     }
 * });
 * ```
 */
export class FakeMulterStorage implements StorageEngine {
  #getDestination: FileProcessingHandler;
  #getFilename: FileProcessingHandler;

  constructor(options: DiskStorageOptions = {}) {
    const destination = options.destination || getDestination;

    if (typeof destination === "string") {
      this.#getDestination = (request, file, cb) => {
        cb(null, destination);
      };
    } else this.#getDestination = destination;

    this.#getFilename = options.filename || getFilename;
  }

  _handleFile: HandleFile = (request, file, callback) => {
    this.#getDestination(request, file, (err, destination = "") => {
      if (err) return callback(err);

      this.#getFilename(request, file, (err, filename = "") => {
        if (err) return callback(err);

        const writableStream = new MemoryWritable();
        const mockPath = [destination, filename].filter(Boolean).join("/");

        writableStream.on("error", (err) => {
          console.error("Error writing file:", err);
          callback(err);
        });

        writableStream.on("finish", () => {
          inMemoryStorage.set(file.originalname, writableStream.getBuffer());

          callback(null, {
            destination,
            filename,
            path: mockPath,
            size: writableStream.size,
          });
        });

        file.stream.pipe(writableStream);
      });
    });
  };

  _removeFile: RemoveFile = (request, { originalname }, callback) => {
    inMemoryStorage.delete(originalname);
    callback(null);
  };
}
