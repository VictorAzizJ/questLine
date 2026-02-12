import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/werewolf.ts",
    "src/ttrpg.ts",
    "src/session.ts",
    "src/player.ts",
    "src/ai.ts",
  ],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
});
