import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load .env from root or local
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("*"),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  GEMINI_API_KEY: z.string().optional().default(""),
  RAZORPAY_KEY_ID: z.string().default("rzp_test_agentcart2026"),
  RAZORPAY_KEY_SECRET: z.string().default("rzp_sec_test_agentcart_secret_2026"),
  RAZORPAY_WEBHOOK_SECRET: z.string().default("rzp_whsec_test_agentcart_webhook_2026"),
  MANDATE_SECRET: z.string().default("agentcart_ap2_mandate_signing_secret_2026")
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://VAIBHAV@localhost:5432/agentcart",
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  NODE_ENV: process.env.NODE_ENV,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "rzp_test_agentcart2026",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "rzp_sec_test_agentcart_secret_2026",
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_whsec_test_agentcart_webhook_2026",
  MANDATE_SECRET: process.env.MANDATE_SECRET || "agentcart_ap2_mandate_signing_secret_2026"
});
