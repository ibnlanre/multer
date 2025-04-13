import tsconfigPaths from "vite-tsconfig-paths";

import { nodePolyfills } from "vite-plugin-node-polyfills";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ["crypto", "stream", "os", "path"],
    }),
    tsconfigPaths(),
  ],
  test: {
    environment: "node",
    globals: true,
  },
});
