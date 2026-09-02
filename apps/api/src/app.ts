import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { envConfig } from "./config/env";
import { loggerConfig } from "./config/fastify/fastifyLoggerConfig";
import { prisma } from "./lib/prisma";
import { registerErrorHandler } from "./middlewares/errorHandling";
import { authRoutes } from "./modules/auth/auth.routes";
import prismaPlugin from "./plugins/prisma";

const app = Fastify({ logger: loggerConfig });
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Library API",
      description: "Documentação da API - Library utilizando Fastify",
      version: "1.0.0",
    },
  },

  transform: jsonSchemaTransform,
});

app.register(fastifySwaggerUi, {
  routePrefix: "/docs",
});

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
