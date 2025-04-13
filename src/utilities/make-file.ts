import { Readable } from "node:stream";

export const makeFile = {
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
