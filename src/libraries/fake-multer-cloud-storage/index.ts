import type { StorageOptions } from "@google-cloud/storage";
import type { Request } from "express";
import type { StorageEngine } from "multer";
import type { MulterGoogleCloudStorageOptions } from "multer-cloud-storage";

import type { RemoveFile } from "@/libraries/fake-multer-storage";
import type { FileProcessingHandler } from "@/utilities/file-processing";

import { v4 } from "uuid";

import { inMemoryStorage } from "@/utilities/in-memory-storage";
import { MemoryWritable } from "@/utilities/memory-writable";

type MulterCloudStorageMetadata = {
  contentType?: string;
  size: number;
  uri: string;
  linkUrl: string;
  selfLink: string;
  bucket?: string;
};

type MulterCloudStorageFile = {
  bucket: string;
  destination: string;
  filename: string;
  path: string;
  contentType: string;
  size: number;
  uri: string;
  linkUrl: string;
  selfLink: string;
  metadata?: MulterCloudStorageMetadata;
};

type MulterCloudStorageHandleFile = (
  request: Request,
  file: Express.Multer.File,
  callback: (error?: any, info?: Partial<MulterCloudStorageFile>) => void
) => void;

interface TypedMulterCloudStorageOptions
  extends MulterGoogleCloudStorageOptions {
  destination?: string | FileProcessingHandler;
  filename?: string | FileProcessingHandler;
}

interface MulterCloudStorageOptions
  extends StorageOptions,
    TypedMulterCloudStorageOptions {
  projectId?: string;
  keyFilename?: string;
}

interface InternalMulterCloudStorageOptions
  extends Omit<
    MulterCloudStorageOptions,
    "bucket" | "projectId" | "keyFilename"
  > {
  projectId?: string | null;
  keyFilename?: string | null;
  bucket?: string | null;
}

/**
 * Mock for Google Cloud Storage using `multer-cloud-storage`.
 *
 * This mock is used to simulate file uploads in tests without actually writing files to Google Cloud Storage.
 *
 * @class FakeMulterCloudStorage
 * @implements {StorageEngine}
 * @param {MulterGoogleCloudStorageOptions} options - Options for the storage engine.
 *
 * @example
 *
 * ```ts
 * /////////////////////////////////
 * // JEST MOCK EXAMPLE
 * /////////////////////////////////
 *
 * jest.mock("multer-cloud-storage", () => {
 *     type MulterCloudStorage = typeof import("multer-cloud-storage");
 *     const originalModule = jest.requireActual<MulterCloudStorage>("multer-cloud-storage");
 *
 *     type MulterStorage = typeof import("@ibnlanre/multer");
 *     const { FakeMulterCloudStorage } = jest.requireActual<MulterStorage>("@ibnlanre/multer");
 *
 *     return {
 *        __esModule: true,
 *        ...originalModule,
 *        default: jest.fn((options) => {
 *            return new FakeMulterCloudStorage(options);
 *        }),
 *     }
 * });
 *
 * /////////////////////////////////
 * // VITEST MOCK EXAMPLE
 * /////////////////////////////////
 *
 * vi.mock("multer-cloud-storage", async (importOriginal) => {
 *     type MulterCloudStorage = typeof import("multer-cloud-storage");
 *     const originalModule = await importOriginal<MulterCloudStorage>();
 *
 *     type MulterStorage = typeof import("@ibnlanre/multer");
 *     const { FakeMulterCloudStorage } = await vi.importActual<MulterStorage>("@ibnlanre/multer");
 *
 *     return {
 *        __esModule: true,
 *        ...originalModule,
 *        default: vi.fn((options) => {
 *            return new FakeMulterCloudStorage(options);
 *        }),
 *     }
 * });
 * ```
 */
export class FakeMulterCloudStorage implements StorageEngine {
  #options: InternalMulterCloudStorageOptions;

  #sanitizeFilename = (filename: string) => {
    if (!filename) return v4();

    return filename
      .replace(/^\.+/g, "")
      .replace(/^\/+/g, "")
      .replace(/\r|\n/g, "_");
  };

  #getFilename: FileProcessingHandler = (
    req: Request,
    file: Express.Multer.File,
    cb
  ) => {
    if (typeof file.originalname === "string") {
      cb(null, file.originalname);
    } else cb(null, v4());
  };

  #getDestination: FileProcessingHandler = (
    req: Request,
    file: Express.Multer.File,
    cb
  ) => {
    cb(null, "");
  };

  #getContentType = (req: Request, file: Express.Multer.File) => {
    if (this.#options.hideFilename) {
      return undefined;
    }

    if (this.#options.uniformBucketLevelAccess) {
      return "application/octet-stream";
    }

    if (this.#options.contentType) {
      if (typeof this.#options.contentType === "function") {
        return this.#options.contentType(req, file);
      }
      return this.#options.contentType;
    }

    return file.mimetype;
  };

  #getBlobFileReference = (req: Request, file: Express.Multer.File) => {
    const blobFile = {
      name: "",
      filename: "",
      destination: "",
      get blobName(): string {
        return this.destination + this.name;
      },
    };

    this.#getDestination(req, file, (err, destination = "") => {
      if (err) {
        return false;
      }

      const escDestination = destination
        .replace(/^\.+/g, "")
        .replace(/^\/+|\/+$/g, "");

      if (escDestination !== "") {
        blobFile.destination = escDestination + "/";
      }
    });

    this.#getFilename(req, file, (err, filename = "") => {
      if (err) {
        return false;
      }

      const name = this.#sanitizeFilename(filename);

      blobFile.filename = name.substring(name.lastIndexOf("/") + 1);
      blobFile.name = encodeURIComponent(name);
    });

    return blobFile;
  };

  constructor(options: MulterCloudStorageOptions) {
    this.#options = options;

    const filename = options.filename || this.#getFilename;
    if (typeof filename === "string") {
      this.#getFilename = (req, file, cb) => cb(null, filename);
    } else this.#getFilename = filename;

    if (options.hideFilename) {
      this.#getFilename = (req, file, cb) => {
        cb(null, `${v4()}`);
      };

      this.#getContentType = (req, file) => {
        return undefined;
      };
    }

    const destination = options.destination || this.#getDestination;
    if (typeof destination === "string") {
      this.#getDestination = (req, file, cb) => cb(null, destination);
    } else this.#getDestination = destination;

    this.#options.bucket = options.bucket || process.env.GCS_BUCKET || null;

    this.#options.projectId =
      options.projectId || process.env.GCLOUD_PROJECT || null;

    this.#options.keyFilename =
      options.keyFilename || process.env.GCS_KEYFILE || null;

    if (!options.bucket) {
      throw new Error(
        "You have to specify bucket for Google Cloud Storage to work."
      );
    }

    if (!options.projectId) {
      throw new Error(
        "You have to specify project id for Google Cloud Storage to work."
      );
    }

    if (!options.keyFilename && !options.credentials) {
      throw new Error(
        "You have to specify credentials key file or credentials object, for Google Cloud Storage to work."
      );
    }
  }

  _handleFile: MulterCloudStorageHandleFile = (request, file, callback) => {
    const { destination, filename } = this.#getBlobFileReference(request, file);

    const path = [destination, filename].filter(Boolean).join("/");
    const bucket = this.#options.bucket || "";
    const storage = [bucket, path].filter(Boolean).join("/");

    const linkUrl = `https://storage.googleapis.com/${storage}`;
    const selfLink = `https://storage.googleapis.com/${storage}`;
    const uri = `gs://${storage}`;

    const writableStream = new MemoryWritable();

    writableStream.on("error", callback);
    writableStream.on("finish", () => {
      inMemoryStorage.set(file.originalname, writableStream.getBuffer());

      callback(null, {
        bucket,
        destination,
        filename,
        path,
        contentType: this.#getContentType(request, file),
        size: writableStream.size,
        uri,
        linkUrl,
        selfLink,
      });
    });

    file.stream.pipe(writableStream);
  };

  _removeFile: RemoveFile = (request, { originalname }, callback) => {
    inMemoryStorage.delete(originalname);
    callback(null);
  };
}
