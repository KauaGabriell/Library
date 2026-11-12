import type { FastifyRequest } from "fastify";

function serializeRequest(request: FastifyRequest) {
  return {
    method: request.method,
    url: (request.raw.url ?? "").split("?", 1)[0] ?? "",
    host: request.headers.host ?? "",
    remoteAddress: request.raw.socket.remoteAddress ?? "",
    remotePort: request.raw.socket.remotePort ?? 0,
  };
}

export const loggerConfig = {
  level: "info",
  serializers: {
    req: serializeRequest,
  },
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "req.headers.x-api-key",
      "req.headers.x-goog-api-key",
      "headers.cookie",
      "headers.authorization",
      "req.cookies.session",
      "req.body",
      "body",
      "payload",
      "requestBody",
      "responseBody",
      "cookies.session",
      "headers.x-api-key",
      "headers.x-goog-api-key",
      "token",
      "tokenHash",
      "accessToken",
      "refreshToken",
      "apiKey",
      "api_key",
      "clientSecret",
      "client_secret",
      "password",
      "passwordHash",
      "note",
      "notes",
      "review",
      "content",
      "additionalContext",
      "err.token",
      "err.tokenHash",
      "err.accessToken",
      "err.refreshToken",
      "err.apiKey",
      "err.clientSecret",
      "err.password",
      "err.passwordHash",
    ],
    remove: true,
  },
};
