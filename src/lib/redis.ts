import { Redis } from "ioredis";
import { appConfig } from "../config/index.js";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(appConfig.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    redisClient.on("error", (error) => {
      console.error("Redis connection error:", error);
    });

    redisClient.on("connect", () => {
      console.log("Redis connected successfully");
    });
  }

  return redisClient;
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
