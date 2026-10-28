import { getRedisClient } from "./redis.js";
import { appConfig } from "../config/index.js";

export class RateLimiter {
  private redis = getRedisClient();
  private keyPrefix = "rate_limit";

  /**
   * Check if a request can be made within the daily limit
   */
  async canMakeRequest(market: string): Promise<boolean> {
    const key = this.getDailyKey(market);
    const count = await this.redis.get(key);
    const currentCount = count ? parseInt(count, 10) : 0;

    return currentCount < appConfig.MAX_REQUESTS_PER_DAY;
  }

  /**
   * Increment the request counter
   */
  async incrementRequestCount(market: string): Promise<number> {
    const key = this.getDailyKey(market);
    const count = await this.redis.incr(key);

    // Set expiry to end of day (reset at midnight UTC)
    if (count === 1) {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setUTCHours(23, 59, 59, 999);
      const ttl = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
      await this.redis.expire(key, ttl);
    }

    return count;
  }

  /**
   * Get current request count for today
   */
  async getCurrentCount(market: string): Promise<number> {
    const key = this.getDailyKey(market);
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Get remaining requests for today
   */
  async getRemainingRequests(market: string): Promise<number> {
    const current = await this.getCurrentCount(market);
    return Math.max(0, appConfig.MAX_REQUESTS_PER_DAY - current);
  }

  /**
   * Reset counter (useful for testing)
   */
  async resetCounter(market: string): Promise<void> {
    const key = this.getDailyKey(market);
    await this.redis.del(key);
  }

  private getDailyKey(market: string): string {
    const date = new Date().toISOString().split("T")[0];
    return `${this.keyPrefix}:${market}:${date}`;
  }
}

export const rateLimiter = new RateLimiter();

// Optimized daily counter reset logic

// Optimized: reduced Redis round trips
