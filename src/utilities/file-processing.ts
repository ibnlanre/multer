import type { Request } from "express";

import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";

export type FileProcessingHandler = (
  request: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, destination?: string) => void
) => void;

/**
 * Get the destination for the file.
 * This function returns the system's temporary directory as the destination.
 */
export const getDestination: FileProcessingHandler = (request, file, cb) => {
  cb(null, tmpdir());
};

/**
 * Get the filename for the file.
 * Generates a random filename using randomBytes and appends the original file extension.
 */
export const getFilename: FileProcessingHandler = (request, file, cb) => {
  randomBytes(16, (err, raw) => {
    if (err) return cb(err);
    cb(null, raw.toString("hex"));
  });
};
