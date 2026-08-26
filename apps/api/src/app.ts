import cors from "@fastify/cors";
import Fastify from "fastify";
import { envConfig } from "./config/env";
import { prisma } from "./lib/prisma";
import prismaPlugin from "./plugins/prisma";

const app = Fastify({ logger: true });

app.register(cors, {
  origin: envConfig.FRONTEND_URL,
  credentials: true,
});

app.register(prismaPlugin);

app.get("/health", (_req, res) => {
  return res.send({ message: "API STATUS: OK" });
});

app.get("/health/db", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { database: "ok" };
});

export { app };
