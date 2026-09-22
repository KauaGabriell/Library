import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

const environmentPath = fileURLToPath(new URL(".env", import.meta.url));
const testEnvironmentPath = fileURLToPath(new URL(".env.test", import.meta.url));

config({ path: environmentPath });
config({ path: testEnvironmentPath, override: true });

process.env.FRONTEND_URL = "http://localhost:5173";
process.env.FRONTEND_OAUTH_CALLBACK_URL =
  "http://localhost:5173/auth/callback";

const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
const testDatabaseName = process.env.TEST_DATABASE_NAME ?? "library_test";

databaseUrl.pathname = `/${testDatabaseName}`;
process.env.DATABASE_URL = databaseUrl.toString();

export default defineConfig({
  test: {
    fileParallelism: false,
    hookTimeout: 10_000,
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 10_000,
  },
});
