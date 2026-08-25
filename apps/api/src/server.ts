import { app } from "./app";
import { envConfig } from "./config/env";

const start = async () => {
  try {
    await app.listen({ port: envConfig.PORT });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
