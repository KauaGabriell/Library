import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:4175";

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
      "node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4175 --strictPort",
    url: baseURL,
    reuseExistingServer: !(
      globalThis as typeof globalThis & {
        process?: { env?: { CI?: string } };
      }
    ).process?.env?.CI,
    env: {
      VITE_API_URL: "http://127.0.0.1:3000",
    },
  },
});
