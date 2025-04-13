/**
 * In-memory storage for files
 *
 * **Note:** The file's `originalname` would be the key in the map, and the value would be the file buffer.
 *
 * @summary This is used to store files in memory for testing purposes.
 * @description This is a simple in-memory storage solution for files.
 * It is not suitable for production use.
 *
 * @type {Map<string, Buffer>}
 * @exports
 *
 * @example
 *
 * ```ts
 * afterEach(() => {
 *      inMemoryStorage.clear();
 * });
 * ```
 */
export const inMemoryStorage = new Map<string, Buffer>();
