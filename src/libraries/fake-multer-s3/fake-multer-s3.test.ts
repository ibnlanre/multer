import type { S3 } from "aws-sdk";
import type { Request } from "express";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ETAG_REGEX } from "@/helpers/etag-regex";
import { inMemoryStorage } from "@/utilities/in-memory-storage";
import { makeFile } from "@/utilities/make-file";
import { FakeMulterS3 } from ".";

describe("FakeMulterS3", () => {
  const mockS3Client = {} as S3;

  const defaultOptions = {
    s3: mockS3Client,
    bucket: "test-bucket",
  };

  let storage: FakeMulterS3;

  beforeEach(() => {
    storage = new FakeMulterS3(defaultOptions);
  });

  afterEach(() => {
    inMemoryStorage.clear();
  });

  const createMockFile = (originalname: string) => {
    return {
      fieldname: "testFile",
      originalname,
      encoding: "7bit",
      mimetype: "text/plain",
      stream: makeFile.readable("test content"),
    } as Express.Multer.File;
  };

  describe("Constructor", () => {
    it("should throw error when s3 client is not provided", () => {
      // @ts-expect-error
      expect(() => new FakeMulterS3({ bucket: "test" })).toThrow(
        "Expected opts.s3 to be object"
      );
    });

    it("should throw error when bucket is not provided", () => {
      // @ts-expect-error
      expect(() => new FakeMulterS3({ s3: mockS3Client })).toThrow(
        "bucket is required"
      );
    });

    it("should accept string bucket name", () => {
      storage = new FakeMulterS3({
        s3: mockS3Client,
        bucket: "test-bucket",
      });

      expect(storage).toBeInstanceOf(FakeMulterS3);
    });

    it("should accept function bucket handler", () => {
      storage = new FakeMulterS3({
        s3: mockS3Client,
        bucket: (req, file, cb) => cb(null, "dynamic-bucket"),
      });

      expect(storage).toBeInstanceOf(FakeMulterS3);
    });
  });

  describe("File Handling", () => {
    const mockRequest = {} as Request;

    it("should handle file upload successfully", () => {
      const mockFile = createMockFile("test.txt");

      storage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();
        expect(info).toBeDefined();
        expect(info?.bucket).toBe("test-bucket");
        expect(info?.key).toBeDefined();
        expect(info?.acl).toBe("private");
        expect(info?.etag).toBeDefined();
        expect(info?.location).toMatch(
          /^https:\/\/test-bucket\.s3\.amazonaws\.com\/.+/
        );
        expect(inMemoryStorage.has("test.txt")).toBe(true);
      });
    });

    it("should generate correct etag for file content", () => {
      const mockFile = createMockFile("test.txt");

      storage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();
        expect(info?.etag).toMatch(ETAG_REGEX);
      });
    });

    it("should handle custom metadata", () => {
      const mockFile = createMockFile("test.txt");
      const customMetadata = { owner: "test" };

      storage = new FakeMulterS3({
        ...defaultOptions,
        metadata: (req, file, cb) => cb(null, customMetadata),
      });

      storage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();
        expect(info?.metadata).toEqual(customMetadata);
      });
    });

    it("should handle custom content type", () => {
      const mockFile = createMockFile("test.txt");
      const customContentType = "application/custom";

      storage = new FakeMulterS3({
        ...defaultOptions,
        contentType: (req, file, cb) => cb(null, customContentType),
      });

      storage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();
        expect(info?.contentType).toBe(customContentType);
      });
    });
  });

  describe("File Removal", () => {
    const mockRequest = {} as Request;

    it("should remove file from storage", () => {
      const mockFile = createMockFile("test.txt");

      storage._handleFile(mockRequest, mockFile, (error) => {
        expect(error).toBeNull();
        expect(inMemoryStorage.has("test.txt")).toBe(true);

        storage._removeFile(mockRequest, mockFile, (removeError) => {
          expect(removeError).toBeNull();
          expect(inMemoryStorage.has("test.txt")).toBe(false);
        });
      });
    });
  });

  describe("Options Handlers", () => {
    const mockRequest = {} as Request;

    it("should handle custom ACL", () => {
      const mockFile = createMockFile("test.txt");

      storage = new FakeMulterS3({
        ...defaultOptions,
        acl: "public-read",
      });

      storage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();
        expect(info?.acl).toBe("public-read");
      });
    });

    it("should handle custom storage class", () => {
      const mockFile = createMockFile("test.txt");

      storage = new FakeMulterS3({
        ...defaultOptions,
        storageClass: "REDUCED_REDUNDANCY",
      });

      storage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();
        expect(info?.storageClass).toBe("REDUCED_REDUNDANCY");
      });
    });

    it("should handle server side encryption", () => {
      const mockFile = createMockFile("test.txt");

      storage = new FakeMulterS3({
        ...defaultOptions,
        serverSideEncryption: "AES256",
      });

      storage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();
        expect(info?.serverSideEncryption).toBe("AES256");
      });
    });
  });
});
