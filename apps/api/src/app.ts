import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { GoogleGenAI } from "@google/genai";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { envConfig } from "./config/env";
import { loggerConfig } from "./config/fastify/fastifyLoggerConfig";
import { multipartConfig } from "./config/fastify/multipartConfig";
import { prisma } from "./lib/prisma";
import { registerErrorHandler } from "./middlewares/errorHandling";
import { authRoutes } from "./modules/auth/authRoutes";
import { bookRoutes } from "./modules/books/bookRoutes";
import { bookCoverRoutes } from "./modules/books/bookCoverRoutes";
import { dashboardRoutes } from "./modules/dashboard/dashboardRoutes";
import { libraryRoutes } from "./modules/library/libraryRoutes";
import { notesRoutes } from "./modules/notes/notesRoutes";
import { readingGoalRoutes } from "./modules/readingGoal/readingGoalRoutes";
import { createGeminiRecommendationProvider } from "./modules/recommendations/geminiRecommendationAdapter";
import { recommendationsRoutes } from "./modules/recommendations/recommendationsRoutes";
import { createRecommendationsService } from "./modules/recommendations/recommendationsService";
import prismaPlugin from "./plugins/prisma";

const app = Fastify({ logger: loggerConfig });
app.decorateRequest("user", null);
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
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
});

registerErrorHandler(app);
app.register(prismaPlugin);
app.register(cookie);
app.register(fastifyRateLimit, {
  global: false,
  addHeaders: {
    "retry-after": true,
  },
  errorResponseBuilder() {
    return {
      statusCode: 429,
      code: "RATE_LIMITED",
      message: "Muitas tentativas. Tente novamente mais tarde.",
    };
  },
});
app.register(multipart, multipartConfig);

const recommendationsService = createRecommendationsService({
  provider: createGeminiRecommendationProvider({
    client: new GoogleGenAI({ apiKey: envConfig.GEMINI_API_KEY }),
    model: envConfig.GEMINI_RECOMMENDATION_MODEL,
  }),
});

app.register(authRoutes, { prefix: "/auth" });
app.register(bookRoutes, { prefix: "/books" });
app.register(bookCoverRoutes, { prefix: "/books/covers" });
app.register(recommendationsRoutes, {
  prefix: "/recommendations",
  recommendationsService,
});
app.register(readingGoalRoutes, { prefix: "/reading-goal" });
app.register(libraryRoutes);
app.register(notesRoutes);
app.register(dashboardRoutes);

app.get("/health", (_req, res) => {
  return res.send({ message: "API STATUS: OK" });
});

app.get("/health/db", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { database: "ok" };
});

export { app };
