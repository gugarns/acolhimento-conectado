import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    fileParallelism: false,
    globalSetup: "./tests/setup-global.ts",
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://acolhe:acolhe@localhost:5432/acolhe_test",
      CONSULTA_CNPJ: "off",
      NODE_ENV: "test",
    },
  },
});
