import { Worker, Job } from "bullmq";
import { getRedisClient } from "../lib/redis.js";
import { ScrapeJobData } from "../queues/index.js";
import { TikTokScraper } from "../scrapers/tiktok/index.js";

const connection = getRedisClient();

/**
 * Process scraping jobs
 */
async function processScrapeJob(job: Job<ScrapeJobData>) {
  console.log(`Processing job ${job.id}:`, job.data);

  const { platform, type, market, params } = job.data;

  try {
    switch (platform) {
      case "tiktok": {
        const scraper = new TikTokScraper(market);
        const result = await scraper.scrape({ type, params });
        await scraper.cleanup();
        return result;
      }

      case "instagram":
      case "amazon":
      case "alibaba":
      case "etsy":
      case "ebay":
      case "facebook":
      case "twitch":
      case "x":
        throw new Error(`Platform ${platform} not yet implemented`);

      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    throw error;
  }
}

/**
 * Create and start the scraper worker
 */
export function createScraperWorker() {
  const worker = new Worker("scraper", processScrapeJob, {
    connection,
    concurrency: 2, // Process 2 jobs concurrently
    limiter: {
      max: 50, // Max 50 jobs
      duration: 3600000, // per hour
    },
  });

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed with error:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("Worker error:", err);
  });

  console.log("Scraper worker started");

  return worker;
}

// Fixed: handle undefined platform gracefully
