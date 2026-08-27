import { buildApp } from "./app.js";
import { env } from "./config/env.js";

async function start() {
  const app = buildApp();

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST
    });
    console.log(`🚀 TechKart Merchant API running at ${address}`);
    console.log(`📑 Health check: ${address}/health`);
    console.log(`🛒 Products API: ${address}/api/v1/products`);
    console.log(`🏪 Merchant API: ${address}/api/v1/merchant`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
