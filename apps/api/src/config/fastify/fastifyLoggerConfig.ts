export const loggerConfig = {
  level: "info",
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "req.cookies.session",
      "req.body.password",
      "body.password",
      "cookies.session",
      "token",
      "tokenHash",
      "password",
      "passwordHash",
      "err.token",
      "err.tokenHash",
      "err.password",
    ],
    remove: true,
  },
};
