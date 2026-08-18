import { createScraperWorker } from "./scraper-worker.js";
import { setupRecurringJobs } from "../queues/index.js";
import { closeRedis } from "../lib/redis.js";
import { closeDb } from "../lib/db.js";

async function main() {
  console.log("Starting workers...");

  // Create workers
  const scraperWorker = createScraperWorker();

  // Setup recurring jobs
  await setupRecurringJobs();

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\nShutting down workers...");

    await scraperWorker.close();
    await closeRedis();
    await closeDb();

    console.log("Workers shut down successfully");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("Workers are running. Press Ctrl+C to stop.");
}

main().catch((error) => {
  console.error("Worker startup failed:", error);
  process.exit(1);
});

// Improved graceful shutdown handling
