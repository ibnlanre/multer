import type { RemoveFile } from "@/libraries/fake-multer-storage";
import type { S3 } from "aws-sdk";
import type { Request } from "express";
import type { StorageEngine } from "multer";

import { createHash } from "node:crypto";
import { v4 } from "uuid";

import { getFilename } from "@/utilities/file-processing";
import { inMemoryStorage } from "@/utilities/in-memory-storage";
import { MemoryWritable } from "@/utilities/memory-writable";

/**
 * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/acl-overview.html#canned-acl
 */
namespace AwsS3Acl {
  /**
   * Owner gets FULL_CONTROL. No one else has access rights (default).
   */
  export type Private = "private";

  /**
   * Owner gets FULL_CONTROL. The AllUsers group gets READ access.
   */
  export type PublicRead = "public-read";

  /**
   * Owner gets FULL_CONTROL. The AllUsers group gets READ and WRITE access. Granting this on a bucket is generally not recommended.
   */
  export type PublicReadWrite = "public-read-write";

  /**
   * Owner gets FULL_CONTROL. Amazon EC2 gets READ access to GET an Amazon Machine Image (AMI) bundle from Amazon S3.
   */
  export type AwsExecRead = "aws-exec-read";

  /**
   * Owner gets FULL_CONTROL. The AuthenticatedUsers group gets READ access.
   */
  export type AuthenticatedRead = "authenticated-read";

  /**
   * Object owner gets FULL_CONTROL. Bucket owner gets READ access. If you specify this canned ACL when creating a bucket, Amazon S3 ignores it.
   */
  export type BucketOwnerRead = "bucket-owner-read";

  /**
   * Both the object owner and the bucket owner get FULL_CONTROL over the object. If you specify this canned ACL when creating a bucket, Amazon S3 ignores it.
   */
  export type BucketOwnerFullControl = "bucket-owner-full-control";

  /**
   * The LogDelivery group gets WRITE and READ_ACP permissions on the bucket. For more information on logs.
   */
  export type LogDeliveryWrite = "log-delivery-write";
}

type Acl =
  | AwsS3Acl.Private
  | AwsS3Acl.PublicRead
  | AwsS3Acl.PublicReadWrite
  | AwsS3Acl.AuthenticatedRead
  | AwsS3Acl.BucketOwnerRead
  | AwsS3Acl.BucketOwnerFullControl
  | AwsS3Acl.LogDeliveryWrite
  | AwsS3Acl.AwsExecRead;

type S3MetadataHandler = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: any, metadata?: any) => void
) => void;

type S3CacheControlHandler = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: any, cacheControl?: string | null) => void
) => void;

type S3BucketHandler = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: any, bucket?: string) => void
) => void;

type S3KeyHandler = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: any, key?: string) => void
) => void;

type S3AclHandler = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: any, acl?: string) => void
) => void;

type S3ContentTypeHandlerCallback = (
  error: any,
  contentType?: string | null,
  stream?: NodeJS.ReadableStream
) => void;

type S3ContentTypeHandler = (
  req: Request,
  file: Express.Multer.File,
  callback: S3ContentTypeHandlerCallback
) => void;

type S3ContentDispositionHandler = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: any, contentDisposition?: string | null) => void
) => void;

type S3StorageClassHandler = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: any, storageClass?: string) => void
) => void;

type S3ServerSideEncryptionHandler = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: any, serverSideEncryption?: string | null) => void
) => void;

export interface S3StorageOptions {
  s3: S3;
  bucket: S3BucketHandler | string;
  key?: S3KeyHandler;
  acl?: S3AclHandler | Acl;
  contentType?: S3ContentTypeHandler;
  metadata?: S3MetadataHandler;
  cacheControl?: S3CacheControlHandler | string;
  contentDisposition?: S3ContentDispositionHandler | string;
  storageClass?: S3StorageClassHandler | string;
  serverSideEncryption?: S3ServerSideEncryptionHandler | string;
}

type S3HandleFile = (
  request: Request,
  file: Express.Multer.File,
  callback: (error?: any, info?: Partial<S3File>) => void
) => void;

interface S3File extends Express.Multer.File {
  bucket: string;
  key: string;
  acl: string;
  etag: string;
  storageClass: string;
  metadata: Record<string, any>;
  size: number;
  contentType?: string | null;
  contentDisposition?: string | null;
  contentEncoding?: string | null;
  location?: string | null;
  cacheControl?: string | null;
  serverSideEncryption?: string | null;
  versionId?: string;
}

/**
 * Mock for `multer-s3` storage engine.
 *
 * This mock simulates the behavior of the `multer-s3` storage engine, allowing you to test file uploads without actually uploading files to S3.
 *
 * @class FakeMulterS3
 * @implements {StorageEngine}
 * @param {S3StorageOptions} options - Options for the storage engine.
 *
 * @example
 *
 * ```ts
 * import { FakeMulterS3 } from "@ibnlanre/multer"
 *
 * /////////////////////////////////
 * // JEST MOCK EXAMPLE
 * /////////////////////////////////
 *
 * jest.mock("multer-s3", () => {
 *     type MulterS3 = typeof import("multer-s3");
 *     const originalModule = jest.requireActual<MulterS3>("multer-s3");
 *
 *     return {
 *         __esModule: true,
 *         ...originalModule,
 *         default: jest.fn((options) => {
 *            return new FakeMulterS3(options);
 *         }),
 *     };
 * });
 *
 * /////////////////////////////////
 * // VITEST MOCK EXAMPLE
 * /////////////////////////////////
 *
 * vi.mock("multer-s3", async (importOriginal) => {
 *     const originalModule = await importOriginal();
 *
 *    return {
 *        __esModule: true,
 *        ...originalModule,
 *        default: vi.fn((options) => {
 *            return new FakeMulterS3(options);
 *        }),
 *    };
 * });
 * ```
 */
export class FakeMulterS3 implements StorageEngine {
  #getKey: S3KeyHandler;

  #getBucket: S3BucketHandler = (req, file, cb) => {
    cb(null, "");
  };

  #getAcl: S3AclHandler = (req, file, cb) => {
    cb(null, "private");
  };

  #getMetadata: S3MetadataHandler = (req, file, cb) => {
    cb(null, null);
  };

  #getContentType: S3ContentTypeHandler = (req, file, cb) => {
    cb(null, file.mimetype);
  };

  #getContentDisposition: S3ContentDispositionHandler = (req, file, cb) => {
    cb(null, null);
  };

  #getCacheControl: S3CacheControlHandler = (req, file, cb) => {
    cb(null, null);
  };

  #getStorageClass: S3StorageClassHandler = (req, file, cb) => {
    cb(null, "STANDARD");
  };

  #getServerSideEncryption: S3ServerSideEncryptionHandler = (req, file, cb) => {
    cb(null, null);
  };

  #getContentEncoding: S3ContentTypeHandler = (req, file, cb) => {
    cb(null, null);
  };

  constructor(options: S3StorageOptions) {
    if (!options.s3) {
      throw new TypeError("Expected opts.s3 to be object");
    }

    if (!options.bucket) {
      throw new TypeError("bucket is required");
    }

    const bucket = options.bucket || this.#getBucket;
    if (typeof bucket === "string") {
      this.#getBucket = (req, file, cb) => cb(null, bucket);
    } else this.#getBucket = bucket;

    if (options.metadata) this.#getMetadata = options.metadata;
    this.#getKey = options.key || getFilename;

    const acl = options.acl || this.#getAcl;
    if (typeof acl === "string") {
      this.#getAcl = (req, file, cb) => cb(null, acl);
    } else this.#getAcl = acl;

    const contentType = options.contentType || this.#getContentType;
    if (typeof contentType === "string") {
      this.#getContentType = (req, file, cb) => cb(null, contentType);
    } else this.#getContentType = contentType;

    const contentDisposition =
      options.contentDisposition || this.#getContentDisposition;
    if (typeof contentDisposition === "string") {
      this.#getContentDisposition = (req, file, cb) =>
        cb(null, contentDisposition);
    } else this.#getContentDisposition = contentDisposition;

    const cacheControl = options.cacheControl || this.#getCacheControl;
    if (typeof cacheControl === "string") {
      this.#getCacheControl = (req, file, cb) => cb(null, cacheControl);
    } else this.#getCacheControl = cacheControl;

    const storageClass = options.storageClass || this.#getStorageClass;
    if (typeof storageClass === "string") {
      this.#getStorageClass = (req, file, cb) => cb(null, storageClass);
    } else this.#getStorageClass = storageClass;

    const serverSideEncryption =
      options.serverSideEncryption || this.#getServerSideEncryption;
    if (typeof serverSideEncryption === "string") {
      this.#getServerSideEncryption = (req, file, cb) =>
        cb(null, serverSideEncryption);
    } else this.#getServerSideEncryption = serverSideEncryption;

    const contentEncoding = options.contentType || this.#getContentEncoding;
    if (typeof contentEncoding === "string") {
      this.#getContentEncoding = (req, file, cb) => cb(null, contentEncoding);
    } else this.#getContentEncoding = contentEncoding;
  }

  _handleFile: S3HandleFile = (request, file, callback) => {
    const writableStream = new MemoryWritable();

    this.#getKey(request, file, (err, key = "") => {
      if (err) return callback(err);

      this.#getBucket(request, file, (err, bucket = "") => {
        if (err) return callback(err);

        this.#getAcl(request, file, (err, acl) => {
          if (err) return callback(err);

          this.#getMetadata(request, file, (err, metadata) => {
            if (err) return callback(err);

            this.#getContentType(request, file, (err, contentType) => {
              if (err) return callback(err);

              this.#getContentDisposition(
                request,
                file,
                (err, contentDisposition) => {
                  if (err) return callback(err);

                  this.#getCacheControl(request, file, (err, cacheControl) => {
                    if (err) return callback(err);

                    this.#getStorageClass(
                      request,
                      file,
                      (err, storageClass) => {
                        if (err) return callback(err);

                        this.#getServerSideEncryption(
                          request,
                          file,
                          (err, serverSideEncryption) => {
                            if (err) return callback(err);

                            this.#getContentEncoding(
                              request,
                              file,
                              (err, contentEncoding) => {
                                if (err) return callback(err);

                                writableStream.on("error", callback);
                                writableStream.on("finish", () => {
                                  const buffer = writableStream.getBuffer();
                                  const etag = `"${createHash("md5")
                                    .update(buffer)
                                    .digest("hex")}"`;
                                  const url = [bucket, "s3.amazonaws.com"]
                                    .filter(Boolean)
                                    .join(".");
                                  const location = `https://${url}/${key}`;
                                  const size = writableStream.size;
                                  const versionId = v4();

                                  inMemoryStorage.set(
                                    file.originalname,
                                    buffer
                                  );

                                  callback(null, {
                                    size,
                                    location,
                                    bucket,
                                    key,
                                    acl,
                                    contentType,
                                    contentDisposition,
                                    contentEncoding,
                                    storageClass,
                                    serverSideEncryption,
                                    metadata,
                                    etag,
                                    versionId,
                                  });
                                });

                                file.stream.pipe(writableStream);
                              }
                            );
                          }
                        );
                      }
                    );
                  });
                }
              );
            });
          });
        });
      });
    });
  };

  _removeFile: RemoveFile = (request, { originalname }, callback) => {
    inMemoryStorage.delete(originalname);
    callback(null);
  };
}
