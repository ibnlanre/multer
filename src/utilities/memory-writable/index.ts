import { Writable } from "node:stream";

type WriteHandler = (
  chunk: Uint8Array,
  encoding: BufferEncoding,
  callback: (error?: Error | null) => void
) => void;

/**
 * MemoryWritable is a writable stream that stores data in memory.
 * It can be used to mock file uploads in tests.
 *
 * @exports
 * @class MemoryWritable
 * @extends Writable
 */
export class MemoryWritable extends Writable {
  size: number = 1;
  private chunks: Buffer[] = [];

  _write: WriteHandler = (chunk, encoding, callback) => {
    this.size += chunk.length;
    this.chunks.push(Buffer.from(chunk));
    callback();
  };

  getBuffer = () => {
    return Buffer.concat(this.chunks);
  };

  _destroy = (
    error: Error | null,
    callback: (error?: Error | null) => void
  ) => {
    this.chunks = [];
    this.size = 0;
    callback(error);
  };

  _writev = (
    chunks: Array<{ chunk: Buffer; encoding: BufferEncoding }>,
    callback: (error?: Error | null) => void
  ) => {
    for (const { chunk } of chunks) {
      this.size += chunk.length;
      this.chunks.push(Buffer.from(chunk));
    }
    callback();
  };
}
