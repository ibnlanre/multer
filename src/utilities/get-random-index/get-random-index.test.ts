import { describe, expect, it } from "vitest";
import { getRandomIndex } from ".";

describe("getRandomIndex", () => {
  it("should return a number between 0 and max - 1", () => {
    const max = 10;
    const result = getRandomIndex(max);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(max);
  });

  it("should return 0 when max is 1", () => {
    const max = 1;
    const result = getRandomIndex(max);
    expect(result).toBe(0);
  });

  it("should handle large max values", () => {
    const max = 1000000;
    const result = getRandomIndex(max);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(max);
  });

  it("should return a number if max is 0 or negative", () => {
    expect(getRandomIndex(0)).toBe(0);
    expect(getRandomIndex(-5)).toBeGreaterThanOrEqual(-5);
  });
});
