import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { envConfig } from "./config/env";
import { loggerConfig } from "./config/fastify/fastifyLoggerConfig";
import { prisma } from "./lib/prisma";
import { registerErrorHandler } from "./middlewares/errorHandling";
import { authRoutes } from "./modules/auth/auth.routes";
import prismaPlugin from "./plugins/prisma";

const app = Fastify({ logger: loggerConfig });

app.register(cors, {
  origin: envConfig.FRONTEND_URL,
  credentials: true,
});

registerErrorHandler(app);
app.register(prismaPlugin);
app.register(cookie);

app.register(authRoutes, { prefix: "/auth" });

app.get("/health", (_req, res) => {
  return res.send({ message: "API STATUS: OK" });
});

app.get("/health/db", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { database: "ok" };
});

export { app };
