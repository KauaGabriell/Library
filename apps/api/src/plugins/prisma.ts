import fp from "fastify-plugin";
import { prisma } from "../lib/prisma";

export default fp(async (app) => {
  app.log.info("Starting database...");

  app.addHook("onReady", async () => {
    await prisma.$connect();
    app.log.info("Database has connected");
  });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
    app.log.info("Shutting down database");
  });
});
