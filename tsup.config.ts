import { defineConfig } from "tsup";

export default defineConfig({
  outDir: "dist",
  dts: true,
  entry: ["src/index.ts"],
  splitting: false,
  sourcemap: true,
  clean: true,
  bundle: true,
  format: ["cjs", "esm"],
  target: "node14",
});
