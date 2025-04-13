import type { Request } from "express";
import type { StorageEngine } from "multer";

import type { RemoveFile } from "@/libraries/fake-multer-storage";

import { extname } from "node:path";
import { v4 } from "uuid";

import { getRandomIndex } from "@/utilities/get-random-index";
import { inMemoryStorage } from "@/utilities/in-memory-storage";
import { MemoryWritable } from "@/utilities/memory-writable";

type AzureContentMetadata = Record<string, any>;
type AzureMetadataHandler = (
  req: Request,
  file: Express.Multer.File
) => Promise<AzureContentMetadata>;

type AzureContentSettings = {
  contentType?: string;
  contentEncoding?: string;
  contentLanguage?: string;
  cacheControl?: string;
  contentDisposition?: string;
};

type FileContentHandler = (
  req: Request,
  file: Express.Multer.File
) => Promise<AzureContentSettings>;

interface AzureStorageOptions {
  connectionString?: string;
  accountName?: string;
  accountKey?: string;
  containerName: string;
  containerAccessLevel?: "private" | "blob" | "container";
  metadata?: AzureContentMetadata | AzureMetadataHandler;
  contentSettings?: AzureContentSettings | FileContentHandler;
  urlExpirationTime?: number;
}

interface AzureBlobFile extends Express.Multer.File {
  url: string;
  blobName: string;
  etag: string;
  blobType: string;
  metadata: AzureContentMetadata;
  container: string;
  blobSize: number;
}

type AzureBlobHandleFile = (
  request: Request,
  file: Express.Multer.File,
  callback: (error?: any, info?: Partial<AzureBlobFile>) => void
) => void;

/**
 * @see {@link https://github.com/Azure/Azurite/blob/main/src/blob/utils/constants.ts Azurite Constants}
 */
export const VALID_AZURE_API_VERSIONS = [
  "2025-05-05",
  "2025-01-05",
  "2024-11-04",
  "2024-08-04",
  "2024-05-04",
  "2024-02-04",
  "2023-11-03",
  "2023-08-03",
  "2023-01-03",
  "2022-11-02",
  "2021-12-02",
  "2021-10-04",
  "2021-08-06",
  "2021-06-08",
  "2021-04-10",
  "2021-02-12",
  "2020-12-06",
  "2020-10-02",
  "2020-08-04",
  "2020-06-12",
  "2020-04-08",
  "2020-02-10",
  "2019-12-12",
  "2019-10-10",
  "2019-07-07",
  "2019-02-02",
  "2018-11-09",
  "2018-03-28",
  "2017-11-09",
  "2017-07-29",
  "2017-04-17",
  "2016-05-31",
  "2015-12-11",
  "2015-07-08",
  "2015-04-05",
  "2015-02-21",
  "2014-02-14",
  "2013-08-15",
  "2012-02-12",
  "2011-08-18",
  "2009-09-19",
  "2009-07-17",
  "2009-04-14",
];

export const VALID_AZURE_BLOB_AUDIENCE = [
  "storage.azure.com",
  "blob.core.windows.net",
  // "e406a681-f3d4-42a8-90b6-c2b029497af1",
  // "blob.core.chinacloudapi.cn",
  // "blob.core.usgovcloudapi.net",
  // "blob.core.cloudapi.de",
];

/**
 * Mock for Azure Blob Storage using `multer-azure-blob-storage`.
 *
 * This mock is used to simulate file uploads in tests without actually writing files to Azure Blob Storage.
 *
 * @class MockAzureBlobStorage
 * @implements {StorageEngine}
 * @param {AzureStorageOptions} options - Options for the storage engine.
 *
 * @see {@link https://learn.microsoft.com/en-us/rest/api/storageservices/create-container#container-access-level Container Access Level}
 *
 * @example
 *
 * ```ts
 * import { FakeMulterAzureBlobStorage } from "@ibnlanre/multer";
 *
 * /////////////////////////////////
 * // JEST MOCK EXAMPLE
 * /////////////////////////////////
 *
 * jest.mock("multer-azure-blob-storage", () => {
 *     const originalModule = jest.requireActual("multer-azure-blob-storage");
 *
 *     return {
 *         __esModule: true,
 *         ...originalModule,
 *         MulterAzureStorage: jest.fn((options) => {
 *            return new FakeMulterAzureBlobStorage(options);
 *        }),
 *     };
 * });
 *
 * /////////////////////////////////
 * // VITEST MOCK EXAMPLE
 * /////////////////////////////////
 *
 * vi.mock("multer-azure-blob-storage", async (importOriginal) => {
 *     const originalModule = await importOriginal();
 *
 *     return {
 *         __esModule: true,
 *         ...originalModule,
 *         MulterAzureStorage: vi.fn((options) => {
 *            return new FakeMulterAzureBlobStorage(options);
 *        }),
 *     };
 * });
 * ```
 */
export class FakeMulterAzureBlobStorage implements StorageEngine {
  #DEFAULT_URL_EXPIRATION_TIME = 60;
  #DEFAULT_CONTAINER_ACCESS_LEVEL = "private";
  #DEFAULT_UPLOAD_CONTAINER = "default-container";

  #accountName: string | undefined;
  #containerName: string;
  #urlExpirationTime: number;
  #containerAccessLevel: string;

  #getMetadata: AzureMetadataHandler = async () => ({});
  #getContentSettings: FileContentHandler = async (req, file) => {
    return {
      contentType: file.mimetype,
      contentDisposition: "inline",
    } satisfies AzureContentSettings;
  };

  constructor(options: AzureStorageOptions) {
    if (!options.containerName) {
      throw new Error("Missing required parameter: Azure container name.");
    }

    this.#accountName = options.accountName;

    this.#containerName =
      options.containerName || this.#DEFAULT_UPLOAD_CONTAINER;

    this.#urlExpirationTime =
      options.urlExpirationTime || this.#DEFAULT_URL_EXPIRATION_TIME;

    this.#containerAccessLevel =
      options.containerAccessLevel || this.#DEFAULT_CONTAINER_ACCESS_LEVEL;

    const metadata = options.metadata || this.#getMetadata;

    if (typeof metadata === "object") {
      this.#getMetadata = async (req, file) => {
        return metadata;
      };
    } else this.#getMetadata = metadata;

    const contentSettings = options.contentSettings || this.#getContentSettings;

    if (typeof contentSettings === "object") {
      this.#getContentSettings = async (req, file) => {
        return contentSettings;
      };
    } else this.#getContentSettings = contentSettings;
  }

  _handleFile: AzureBlobHandleFile = async (request, file, callback) => {
    try {
      const writableStream = new MemoryWritable();

      const container = this.#containerName;
      const blobName = `${file.fieldname}-${v4()}${extname(file.originalname)}`;
      const metadata = await this.#getMetadata(request, file);

      const audience =
        VALID_AZURE_BLOB_AUDIENCE[
          getRandomIndex(VALID_AZURE_BLOB_AUDIENCE.length)
        ];
      const storage = [this.#accountName, audience].filter(Boolean).join(".");
      const blob = `https://${storage}/${container}/${blobName}`;

      /**
       * @see {@link https://learn.microsoft.com/en-us/training/modules/implement-shared-access-signatures/2-shared-access-signatures-overview Shared Access Signature}
       */
      const sharedAccessSignature = new URLSearchParams({
        sp: "r",
        st: new Date().toISOString(),
        se: new Date(
          Date.now() + this.#urlExpirationTime * 60 * 1000
        ).toISOString(),
        sv: VALID_AZURE_API_VERSIONS[
          getRandomIndex(VALID_AZURE_API_VERSIONS.length)
        ],
        sr: "b",
        sig: v4(),
      }).toString();

      const url = `${blob}?${sharedAccessSignature}`;

      writableStream.on("error", callback);
      writableStream.on("finish", () => {
        const buffer = writableStream.getBuffer();
        inMemoryStorage.set(file.originalname, buffer);

        const azureFile: Partial<AzureBlobFile> = {
          url,
          blobName,
          etag: `"${v4()}"`,
          blobType: "BlockBlob",
          metadata,
          container,
          blobSize: writableStream.size,
        };
        callback(null, azureFile);
      });

      file.stream.pipe(writableStream);
    } catch (error) {
      callback(error);
    }
  };

  _removeFile: RemoveFile = (request, { originalname }, callback) => {
    inMemoryStorage.delete(originalname);
    callback(null);
  };
}
