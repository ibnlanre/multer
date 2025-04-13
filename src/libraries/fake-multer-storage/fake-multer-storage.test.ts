import type { Request } from "express";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MD5_REGEX } from "@/helpers/md5-regex";
import { inMemoryStorage } from "@/utilities/in-memory-storage";
import { makeFile } from "@/utilities/make-file";
import { FakeMulterStorage } from ".";

describe("FakeMulterStorage", () => {
  let storage: FakeMulterStorage;
  const mockRequest = {} as Request;

  const createMockFile = (originalname: string = "test.txt") => {
    return {
      fieldname: "testFile",
      originalname,
      encoding: "7bit",
      mimetype: "text/plain",
      stream: makeFile.readable("test content"),
    } as Express.Multer.File;
  };

  beforeEach(() => {
    storage = new FakeMulterStorage();
  });

  afterEach(() => {
    inMemoryStorage.clear();
  });

  describe("Constructor", () => {
    it("should initialize with default options", () => {
      expect(storage).toBeInstanceOf(FakeMulterStorage);
    });

    it("should accept custom destination as string", () => {
      const customPath = "/custom/path";
      const customStorage = new FakeMulterStorage({ destination: customPath });
      const mockFile = createMockFile();

      customStorage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();
        expect(info?.destination).toBe(customPath);
      });
    });

    it("should accept custom filename function", () => {
      const customFilename = "custom.txt";
      const customStorage = new FakeMulterStorage({
        filename: (req, file, cb) => cb(null, customFilename),
      });
      const mockFile = createMockFile();

      customStorage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();
        expect(info?.filename).toBe(customFilename);
      });
    });
  });

  describe("File Handling", () => {
    it("should handle file upload successfully", () => {
      const mockFile = createMockFile();

      storage._handleFile(mockRequest, mockFile, (error, info) => {
        expect(error).toBeNull();
        expect(info).toBeDefined();
        expect(info?.filename).toMatch(MD5_REGEX);
        expect(info?.path).toBe(`${info?.destination}/${info?.filename}`);
        expect(info?.size).toBeGreaterThan(0);
        expect(inMemoryStorage.has(mockFile.originalname)).toBe(true);
      });
    });

    it("should handle destination errors", () => {
      const errorStorage = new FakeMulterStorage({
        destination: (req, file, cb) => cb(new Error("Destination error"), ""),
      });
      const mockFile = createMockFile();

      errorStorage._handleFile(mockRequest, mockFile, (error) => {
        expect(error).toBeDefined();
        expect(error.message).toBe("Destination error");
      });
    });

    it("should handle filename errors", () => {
      const errorStorage = new FakeMulterStorage({
        filename: (req, file, cb) => cb(new Error("Filename error"), ""),
      });
      const mockFile = createMockFile();

      errorStorage._handleFile(mockRequest, mockFile, (error) => {
        expect(error).toBeDefined();
        expect(error.message).toBe("Filename error");
      });
    });

    it("should store file content in memory", () => {
      const mockFile = createMockFile();
      const testContent = "test content";
      mockFile.stream = makeFile.readable(testContent);

      storage._handleFile(mockRequest, mockFile, () => {
        const storedContent = inMemoryStorage.get(mockFile.originalname);
        expect(storedContent).toBeDefined();
        expect(storedContent?.toString()).toBe(testContent);
      });
    });
  });

  describe("File Removal", () => {
    it("should remove file from storage", () => {
      const mockFile = createMockFile();

      storage._handleFile(mockRequest, mockFile, () => {
        expect(inMemoryStorage.has(mockFile.originalname)).toBe(true);

        storage._removeFile(mockRequest, mockFile, (error) => {
          expect(error).toBeNull();
          expect(inMemoryStorage.has(mockFile.originalname)).toBe(false);
        });
      });
    });

    it("should handle non-existent file removal gracefully", () => {
      const mockFile = createMockFile("nonexistent.txt");

      storage._removeFile(mockRequest, mockFile, (error) => {
        expect(error).toBeNull();
      });
    });
  });
});
