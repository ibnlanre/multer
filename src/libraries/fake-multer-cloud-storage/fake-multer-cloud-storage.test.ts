import type { Request } from "express";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { UUID_REGEX } from "@/helpers/uuid-regex";
import { inMemoryStorage } from "@/utilities/in-memory-storage";
import { makeFile } from "@/utilities/make-file";
import { FakeMulterCloudStorage } from ".";

describe("FakeMulterCloudStorage", () => {
  const defaultOptions = {
    bucket: "test-bucket",
    projectId: "test-project",
    keyFilename: "test-key.json",
  };

  let storage: FakeMulterCloudStorage;

  beforeEach(() => {
    storage = new FakeMulterCloudStorage(defaultOptions);
  });

  afterEach(() => {
    inMemoryStorage.clear();
  });

  describe("File Naming", () => {
    const mockRequest = {} as Request;
    const createMockFile = (originalname: string) => {
      return {
        fieldname: "testFile",
        originalname,
        encoding: "7bit",
        mimetype: "text/plain",
        stream: makeFile.readable("test content"),
      } as Express.Multer.File;
    };

    it("should use originalname as filename by default", () => {
      const mockFile = createMockFile("test.txt");

      storage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();

        expect(info).toBeDefined();
        expect(info?.filename).toBe("test.txt");
      });
    });

    it("should use custom string filename when provided", () => {
      storage = new FakeMulterCloudStorage({
        ...defaultOptions,
        filename: "custom.txt",
      });

      const mockFile = createMockFile("test.txt");
      storage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();
        expect(info?.filename).toBe("custom.txt");
      });
    });

    it("should use custom filename function when provided", () => {
      const mockFile = createMockFile("test.txt");

      storage = new FakeMulterCloudStorage({
        ...defaultOptions,
        filename: (req, file, cb) => {
          cb(null, `${file.fieldname}-custom.txt`);
        },
      });

      storage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();
        expect(info?.filename).toBe("testFile-custom.txt");
      });
    });

    it("should generate UUID when originalname is not a string", () => {
      const mockFile = createMockFile("");
      Object.defineProperty(mockFile, "originalname", { value: null });

      storage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();
        expect(info?.filename).toMatch(UUID_REGEX);
      });
    });

    it("should sanitize and encode filenames", () => {
      const mockFile = createMockFile("../../../test/../file.txt\n\r");

      storage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();

        expect(info?.filename).not.toContain("..");
        expect(info?.filename).not.toContain("/");
        expect(info?.filename).not.toContain("\n");
        expect(info?.filename).not.toContain("\r");
      });
    });

    it("should generate UUID when hideFilename option is true", () => {
      const mockFile = createMockFile("test.txt");

      storage = new FakeMulterCloudStorage({
        ...defaultOptions,
        hideFilename: true,
      });

      storage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();
        expect(info?.filename).toMatch(UUID_REGEX);
      });
    });
  });
});
