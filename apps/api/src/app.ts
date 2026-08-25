import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", (_req, res) => {
  return res.send({ message: "API STATUS: OK" });
});

export { app };
