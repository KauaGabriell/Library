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

  it("removes private notes, reviews, and request payloads from logs", async () => {
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

    testApp.post("/private-data", async (request) => {
      request.log.info(
        {
          body: request.body,
          payload: request.body,
          headers: request.headers,
          note: { content: "private-top-level-note" },
          review: "private-top-level-review",
        },
        "testing private data redaction",
      );
      return { ok: true };
    });

    await testApp.inject({
      method: "POST",
      url: "/private-data",
      headers: {
        authorization: "Bearer private-authorization",
        cookie: "session=private-cookie",
        "x-api-key": "private-api-key",
        "x-goog-api-key": "private-provider-key",
      },
      payload: {
        note: { content: "private-note-content" },
        notes: [{ content: "private-notes-array-content" }],
        review: "private-review-content",
        additionalContext: "private-request-payload",
      },
    });

    expect(output).toContain("testing private data redaction");
    expect(output).not.toContain("private-note-content");
    expect(output).not.toContain("private-review-content");
    expect(output).not.toContain("private-notes-array-content");
    expect(output).not.toContain("private-request-payload");
    expect(output).not.toContain("private-top-level-note");
    expect(output).not.toContain("private-top-level-review");
    expect(output).not.toContain("private-provider-key");
    expect(output).not.toContain("private-api-key");
    expect(output).not.toContain("private-authorization");
    expect(output).not.toContain("private-cookie");

    await testApp.close();
  });

  it("omits OAuth credentials from logged request URLs", async () => {
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

    testApp.get("/auth/google/callback", async () => ({ ok: true }));

    await testApp.inject({
      method: "GET",
      url: "/auth/google/callback?code=private-oauth-code&state=private-oauth-state",
    });

    expect(output).toContain("/auth/google/callback");
    expect(output).not.toContain("private-oauth-code");
    expect(output).not.toContain("private-oauth-state");

    await testApp.close();
  });
});
