import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";
import path from "node:path";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: {
    fs: {
      // Allow importing shared/generated code from the monorepo root (e.g. convex/_generated).
      allow: [path.resolve(__dirname, "../..")],
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: "src/popup/index.html",
        background: "src/background/index.ts",
      },
    },
  },
});
