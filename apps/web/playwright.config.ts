import { defineConfig } from "@playwright/test";

const processEnvironment = (
  globalThis as typeof globalThis & {
    process?: { env?: { CI?: string; LIBRARY_E2E_PORT?: string } };
  }
).process?.env;
const port = processEnvironment?.LIBRARY_E2E_PORT ?? "4175";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  workers: 1,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      `node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !processEnvironment?.CI,
    env: {
      VITE_API_URL: "http://127.0.0.1:3000",
    },
  },
});
