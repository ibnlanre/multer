import { describe, expect, it } from "vitest";
import { MemoryWritable } from ".";

describe("MemoryWritable", () => {
  it("should initialize with size 1 and an empty buffer", () => {
    const memoryWritable = new MemoryWritable();
    expect(memoryWritable.size).toBe(1);
    expect(memoryWritable.getBuffer().length).toBe(0);
  });

  it("should write data to the buffer and update size", () => {
    const memoryWritable = new MemoryWritable();
    const data = Buffer.from("test data");

    memoryWritable.write(data, "utf-8", () => {
      expect(memoryWritable.size).toBe(1 + data.length);
      expect(memoryWritable.getBuffer().toString()).toBe("test data");
    });
  });

  it("should handle multiple writes correctly", () => {
    const memoryWritable = new MemoryWritable();
    const data1 = Buffer.from("first");
    const data2 = Buffer.from("second");

    memoryWritable.write(data1, "utf-8", () => {
      memoryWritable.write(data2, "utf-8", () => {
        expect(memoryWritable.size).toBe(1 + data1.length + data2.length);
        expect(memoryWritable.getBuffer().toString()).toBe("firstsecond");
      });
    });
  });

  it("should clear buffer and reset size on destroy", () => {
    const memoryWritable = new MemoryWritable();
    const data = Buffer.from("test data");

    memoryWritable.write(data, "utf-8", () => {
      memoryWritable.destroy();
      expect(memoryWritable.size).toBe(0);
      expect(memoryWritable.getBuffer().length).toBe(0);
    });
  });

  it("should handle _writev for multiple chunks", () => {
    const memoryWritable = new MemoryWritable();
    const chunks = [
      { chunk: Buffer.from("chunk1"), encoding: "utf-8" },
      { chunk: Buffer.from("chunk2"), encoding: "utf-8" },
    ] satisfies Array<{ chunk: Buffer; encoding: BufferEncoding }>;

    memoryWritable._writev(chunks, () => {
      expect(memoryWritable.size).toBe(
        1 + chunks[0].chunk.length + chunks[1].chunk.length
      );
      expect(memoryWritable.getBuffer().toString()).toBe("chunk1chunk2");
    });
  });

  it("should call callback with error on destroy if error is provided", () => {
    const memoryWritable = new MemoryWritable();
    const error = new Error("Test error");

    memoryWritable.destroy(error);
    memoryWritable.on("error", (err) => {
      expect(err).toBe(error);
      expect(memoryWritable.size).toBe(0);
      expect(memoryWritable.getBuffer().length).toBe(0);
    });
  });
});
