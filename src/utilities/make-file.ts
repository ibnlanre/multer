import { Readable } from "node:stream";

export const makeFile = {
  size: (bytes: number, unit: "B" | "KB" | "MB") => {
    if (typeof bytes !== "number" || bytes < 0) {
      throw new Error("Size must be a positive number");
    }

    switch (unit) {
      case "B":
        return bytes;
      case "KB":
        return bytes * 1024;
      case "MB":
        return bytes * 1024 * 1024;
      default:
        throw new Error("Invalid weight. Use 'B', 'KB', or 'MB'.");
    }
  },
  buffer: (content: string): Buffer => {
    if (typeof content !== "string") {
      throw new Error("Content must be a string");
    }
    return Buffer.from(content, "utf-8");
  },
  blob: (content: string, type?: string): Blob => {
    const buffer = makeFile.buffer(content);
    return new Blob([buffer], { type });
  },
  stream: (content: string): ReadableStream => {
    const buffer = makeFile.buffer(content);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(buffer);
        controller.close();
      },
    });
  },
  readable: (content: string): Readable => {
    if (typeof content !== "string") {
      throw new Error("Content must be a string");
    }
    return Readable.from([content]);
  },
};
