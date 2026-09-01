import { Writable } from "node:stream";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { loggerConfig } from "./fastifyLoggerConfig.js";

describe("logger configuration", () => {
  it("removes sensitive authentication data from logs", async () => {
    let output = "";

    const stream = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();

        callback();
      },
    });

    const testApp = Fastify({
      logger: {
        ...loggerConfig,
        stream,
      },
    });

    testApp.log.info(
      {
        body: { password: "real-password" },
        cookies: { session: "real-cookie" },
        token: "real-token",
      },
      "testing redaction",
    );

    expect(output).not.toContain("real-password");
    expect(output).not.toContain("real-cookie");
    expect(output).not.toContain("real-token");

    await testApp.close();
  });
});
