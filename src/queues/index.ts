import { Queue, Worker, Job } from "bullmq";
import { getRedisClient } from "../lib/redis.js";
import { appConfig } from "../config/index.js";

const connection = getRedisClient();

// ============================================================================
// Queue Definitions
// ============================================================================

export const scraperQueue = new Queue("scraper", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging
    },
  },
});

// ============================================================================
// Job Types
// ============================================================================

export interface ScrapeJobData {
  platform: "tiktok" | "instagram" | "amazon" | "alibaba" | "etsy" | "ebay" | "facebook" | "twitch" | "x";
  type: "products" | "hashtags" | "sounds" | "videos" | "creators";
  market: string;
  params?: Record<string, unknown>;
}

// ============================================================================
// Job Creators
// ============================================================================

export async function createScrapeJob(data: ScrapeJobData) {
  const job = await scraperQueue.add(
    `${data.platform}-${data.type}`,
    data,
    {
      jobId: `${data.platform}-${data.type}-${data.market}-${Date.now()}`,
    }
  );

  console.log(`Created scrape job: ${job.id}`);
  return job;
}

// ============================================================================
// Recurring Jobs (Cron-like scheduling)
// ============================================================================

export async function setupRecurringJobs() {
  // TikTok products - Daily at 2 AM UTC
  await scraperQueue.add(
    "tiktok-products",
    {
      platform: "tiktok",
      type: "products",
      market: appConfig.MARKET,
    } as ScrapeJobData,
    {
      repeat: {
        pattern: "0 2 * * *", // 2 AM daily
      },
      jobId: `tiktok-products-${appConfig.MARKET}`,
    }
  );

  // TikTok sounds - Daily at 3 AM UTC
  await scraperQueue.add(
    "tiktok-sounds",
    {
      platform: "tiktok",
      type: "sounds",
      market: appConfig.MARKET,
    } as ScrapeJobData,
    {
      repeat: {
        pattern: "0 3 * * *", // 3 AM daily
      },
      jobId: `tiktok-sounds-${appConfig.MARKET}`,
    }
  );

  // TikTok hashtags - Daily at 3:30 AM UTC
  await scraperQueue.add(
    "tiktok-hashtags",
    {
      platform: "tiktok",
      type: "hashtags",
      market: appConfig.MARKET,
    } as ScrapeJobData,
    {
      repeat: {
        pattern: "30 3 * * *", // 3:30 AM daily
      },
      jobId: `tiktok-hashtags-${appConfig.MARKET}`,
    }
  );

  // TikTok videos - Daily at 4:30 AM UTC
  await scraperQueue.add(
    "tiktok-videos",
    {
      platform: "tiktok",
      type: "videos",
      market: appConfig.MARKET,
    } as ScrapeJobData,
    {
      repeat: {
        pattern: "30 4 * * *", // 4:30 AM daily
      },
      jobId: `tiktok-videos-${appConfig.MARKET}`,
    }
  );

  console.log(`Recurring jobs set up for market: ${appConfig.MARKET}`);
}

// ============================================================================
// Queue Management
// ============================================================================

export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    scraperQueue.getWaitingCount(),
    scraperQueue.getActiveCount(),
    scraperQueue.getCompletedCount(),
    scraperQueue.getFailedCount(),
    scraperQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

export async function clearQueue() {
  await scraperQueue.obliterate({ force: true });
  console.log("Queue cleared");
}

// Added exponential backoff retry strategy
