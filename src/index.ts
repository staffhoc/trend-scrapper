import { createScrapeJob, getQueueStats } from "./queues/index.js";
import { appConfig } from "./config/index.js";

/**
 * CLI entry point for manual scraping
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "scrape": {
      const platform = args[1] as "tiktok";
      const type = args[2] as "products" | "hashtags" | "sounds" | "videos";

      if (!platform || !type) {
        console.error("Usage: npm run dev scrape <platform> <type>");
        console.error("Example: npm run dev scrape tiktok products");
        process.exit(1);
      }

      console.log(`Creating scrape job for ${platform} ${type} in ${appConfig.MARKET}`);

      const job = await createScrapeJob({
        platform,
        type,
        market: appConfig.MARKET,
      });

      console.log(`Job created: ${job.id}`);
      break;
    }

    case "stats": {
      const stats = await getQueueStats();
      console.log("Queue statistics:");
      console.log(JSON.stringify(stats, null, 2));
      break;
    }

    default:
      console.log("Available commands:");
      console.log("  scrape <platform> <type> - Create a scrape job");
      console.log("  stats - Show queue statistics");
      break;
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
