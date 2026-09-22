process.env.NODE_ENV ??= "test";
process.env.PORT ??= "3001";
process.env.DATABASE_URL ??=
  "postgresql://test:test@localhost:5432/library_test?schema=public";
process.env.FRONTEND_URL ??= "http://localhost:5173";
process.env.FRONTEND_OAUTH_CALLBACK_URL ??=
  "http://localhost:5173/auth/callback";
process.env.GOOGLE_CLIENT_ID ??= "test-client-id";
process.env.GOOGLE_CLIENT_SECRET ??= "test-client-secret";
process.env.GOOGLE_REDIRECT_URI ??=
  "http://localhost:3001/auth/google/callback";
process.env.OAUTH_AUTHORIZATION_TTL_SECONDS ??= "300";
