import type { Request } from "express";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { inMemoryStorage } from "@/utilities/in-memory-storage";
import { makeFile } from "@/utilities/make-file";
import { FakeMulterAzureBlobStorage } from ".";

describe("FakeMulterAzureBlobStorage", () => {
  const defaultOptions = {
    containerName: "test-container",
    accountName: "testaccount",
  };

  let storage: FakeMulterAzureBlobStorage;

  beforeEach(() => {
    storage = new FakeMulterAzureBlobStorage(defaultOptions);
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

  it("should initialize with required options", () => {
    expect(() => new FakeMulterAzureBlobStorage(defaultOptions)).not.toThrow();
  });

  it("should throw error when containerName is missing", () => {
    expect(
      // @ts-expect-error
      () => new FakeMulterAzureBlobStorage({ accountName: "testaccount" })
    ).toThrow("Missing required parameter: Azure container name.");
  });

  it("should handle file upload successfully", () => {
    const mockFile = createMockFile("test.txt");
    const mockRequest = {} as Request;

    storage._handleFile(mockRequest, mockFile, (error, info) => {
      expect(error).toBeNull();
      expect(info).toBeDefined();
      expect(info?.url).toMatch(/^https:\/\/.+\/test-container\/.+/);
      expect(info?.blobName).toMatch(/^testFile-.+\.txt$/);
      expect(info?.container).toBe("test-container");
      expect(info?.blobType).toBe("BlockBlob");
      expect(inMemoryStorage.has(mockFile.originalname)).toBe(true);
    });
  });

  it("should handle file removal", () => {
    const mockFile = createMockFile("test.txt");
    const mockRequest = {} as Request;

    storage._handleFile(mockRequest, mockFile, (error, info) => {
      expect(inMemoryStorage.has(mockFile.originalname)).toBe(true);

      storage._removeFile(mockRequest, mockFile, (removeError) => {
        expect(removeError).toBeNull();
        expect(inMemoryStorage.has(mockFile.originalname)).toBe(false);
      });
    });
  });

  it("should generate valid Azure Blob Storage URLs", () => {
    const mockFile = createMockFile("test.txt");
    const mockRequest = {} as Request;

    storage._handleFile(mockRequest, mockFile, (error, info) => {
      expect(error).toBeNull();
      expect(info?.url).toBeDefined();

      const url = new URL(info!.url!);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toMatch(/\.(?:windows\.net|azure\.com)$/);
      expect(url.pathname).toMatch(/^\/test-container\/.+/);

      const params = new URLSearchParams(url.search);
      expect(params.get("sp")).toBe("r");
      expect(params.get("sv")).toBeDefined();
      expect(params.get("sr")).toBe("b");
      expect(params.get("sig")).toBeDefined();
      expect(params.get("st")).toBeDefined();
      expect(params.get("se")).toBeDefined();
    });
  });

  it("should handle custom metadata", () => {
    const mockRequest = {} as Request;
    const customMetadata = { testKey: "testValue" };
    const storageWithMetadata = new FakeMulterAzureBlobStorage({
      ...defaultOptions,
      metadata: customMetadata,
    });
    const mockFile = createMockFile("test.txt");

    storageWithMetadata._handleFile(mockRequest, mockFile, (error, info) => {
      expect(error).toBeNull();
      expect(info?.metadata).toEqual(customMetadata);
    });
  });
});
