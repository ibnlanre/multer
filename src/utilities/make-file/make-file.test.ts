import { describe, expect, it } from "vitest";

import { Readable } from "stream";
import { makeFile } from ".";

describe("makeFile", () => {
  describe("size", () => {
    it("should return the correct size in bytes", () => {
      expect(makeFile.size(1, "B")).toBe(1);
    });

    it("should return the correct size in kilobytes", () => {
      expect(makeFile.size(1, "KB")).toBe(1024);
    });

    it("should return the correct size in megabytes", () => {
      expect(makeFile.size(1, "MB")).toBe(1024 * 1024);
    });

    it("should throw an error for negative size", () => {
      expect(() => makeFile.size(-1, "B")).toThrow(
        "Size must be a positive number"
      );
    });

    it("should throw an error for invalid unit", () => {
      expect(() => makeFile.size(1, "GB" as any)).toThrow(
        "Invalid weight. Use 'B', 'KB', or 'MB'."
      );
    });
  });

  describe("buffer", () => {
    it("should return a buffer from a string", () => {
      const content = "Hello, world!";
      const buffer = makeFile.buffer(content);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe(content);
    });

    it("should throw an error if content is not a string", () => {
      expect(() => makeFile.buffer(123 as any)).toThrow(
        "Content must be a string"
      );
    });
  });

  describe("blob", () => {
    it("should return a Blob from a string", () => {
      const content = "Hello, world!";
      const blob = makeFile.blob(content);
      expect(blob).toBeInstanceOf(Blob);
    });

    it("should accept an optional type", () => {
      const content = "Hello, world!";
      const type = "text/plain";
      const blob = makeFile.blob(content, type);
      expect(blob.type).toBe(type);
    });
  });

  describe("stream", () => {
    it("should return a ReadableStream from a string", async () => {
      const content = "Hello, world!";
      const stream = makeFile.stream(content);
      expect(stream).toBeInstanceOf(ReadableStream);

      const reader = stream.getReader();
      const { value, done } = await reader.read();
      expect(done).toBe(false);
      expect(new TextDecoder().decode(value)).toBe(content);
    });
  });

  describe("readable", () => {
    it("should return a Readable from a string", async () => {
      const content = "Hello, world!";
      const readable = makeFile.readable(content);
      expect(readable).toBeInstanceOf(Readable);

      const chunks: string[] = [];
      for await (const chunk of readable) {
        chunks.push(chunk);
      }
      expect(chunks.join("")).toBe(content);
    });

    it("should throw an error if content is not a string", () => {
      expect(() => makeFile.readable(123 as any)).toThrow(
        "Content must be a string"
      );
    });
  });
});
