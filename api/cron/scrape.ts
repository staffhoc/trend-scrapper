import { createScrapeJob } from "../../src/queues/index.js";

/**
 * Vercel serverless function for scheduled scraping
 * This runs on Vercel's infrastructure and triggers scrape jobs
 */
export default async function handler(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const market = process.env.MARKET || "US";
  const jobs = [];

  try {
    // Create scrape jobs for all types
    const productJob = await createScrapeJob({
      platform: "tiktok",
      type: "products",
      market,
    });
    jobs.push({ type: "products", id: productJob.id });

    const hashtagJob = await createScrapeJob({
      platform: "tiktok",
      type: "hashtags",
      market,
    });
    jobs.push({ type: "hashtags", id: hashtagJob.id });

    const soundJob = await createScrapeJob({
      platform: "tiktok",
      type: "sounds",
      market,
    });
    jobs.push({ type: "sounds", id: soundJob.id });

    const videoJob = await createScrapeJob({
      platform: "tiktok",
      type: "videos",
      market,
    });
    jobs.push({ type: "videos", id: videoJob.id });

    return new Response(
      JSON.stringify({
        success: true,
        market,
        jobs,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Failed to create scrape jobs:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create scrape jobs",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export const config = {
  runtime: "edge",
};
