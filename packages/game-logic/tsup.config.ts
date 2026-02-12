import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/werewolf/index.ts",
    "src/ttrpg/index.ts",
    "src/pomodoro/index.ts",
    "src/dice/index.ts",
  ],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["@questline/types"],
});
