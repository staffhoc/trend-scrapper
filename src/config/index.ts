import { config } from "dotenv";
import { z } from "zod";

config();

const configSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Sentry (optional)
  SENTRY_DSN: z.string().optional(),

  // Market
  MARKET: z.enum(["US", "GB", "DE", "FR", "IT", "ID", "MY", "MX", "PH", "SG", "ES", "TH", "VN", "BR", "JP", "IE"]).default("US"),

  // Rate Limiting
  MAX_REQUESTS_PER_DAY: z.coerce.number().default(500),
  CONCURRENT_REQUESTS: z.coerce.number().default(2),

  // Scraping
  HEADLESS: z.coerce.boolean().default(true),
  TIMEOUT_MS: z.coerce.number().default(30000),
});

export type Config = z.infer<typeof configSchema>;

let parsedConfig: Config;

try {
  parsedConfig = configSchema.parse(process.env);
} catch (error) {
  console.error("Configuration validation failed:", error);
  throw error;
}

export const appConfig = parsedConfig;

// Updated for production deployment
