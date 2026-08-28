import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

const environmentPath = fileURLToPath(new URL(".env", import.meta.url));
const testEnvironmentPath = fileURLToPath(new URL(".env.test", import.meta.url));

config({ path: environmentPath });
config({ path: testEnvironmentPath, override: true });

const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
const testDatabaseName = process.env.TEST_DATABASE_NAME ?? "library_test";

databaseUrl.pathname = `/${testDatabaseName}`;
process.env.DATABASE_URL = databaseUrl.toString();

export default defineConfig({
  test: {
    fileParallelism: false,
    hookTimeout: 10_000,
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 10_000,
  },
});
