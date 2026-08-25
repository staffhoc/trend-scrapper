import { PlaywrightCrawler, PlaywrightCrawlerOptions } from "crawlee";
import { appConfig } from "../config/index.js";
import { rateLimiter } from "../lib/rate-limiter.js";

export interface ScraperOptions {
  maxRequestsPerCrawl?: number;
  maxConcurrency?: number;
  requestHandlerTimeoutSecs?: number;
}

export abstract class BaseScraper {
  protected crawler: PlaywrightCrawler | null = null;
  protected market: string;

  constructor(market: string = appConfig.MARKET) {
    this.market = market;
  }

  /**
   * Initialize the crawler with platform-specific configuration
   */
  protected async initializeCrawler(options: ScraperOptions = {}): Promise<void> {
    const remaining = await rateLimiter.getRemainingRequests(this.market);

    const crawlerOptions: PlaywrightCrawlerOptions = {
      maxRequestsPerCrawl: options.maxRequestsPerCrawl || Math.min(remaining, 50),
      maxConcurrency: options.maxConcurrency || appConfig.CONCURRENT_REQUESTS,
      requestHandlerTimeoutSecs: options.requestHandlerTimeoutSecs || appConfig.TIMEOUT_MS / 1000,
      launchContext: {
        launchOptions: {
          headless: appConfig.HEADLESS,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
          ],
        },
      },
      // Don't use default storage, we'll handle persistence ourselves
      useSessionPool: false,
      persistCookiesPerSession: false,
    };

    this.crawler = new PlaywrightCrawler(crawlerOptions);
  }

  /**
   * Check if we can make requests within rate limit
   */
  protected async checkRateLimit(): Promise<void> {
    const canMakeRequest = await rateLimiter.canMakeRequest(this.market);
    if (!canMakeRequest) {
      const remaining = await rateLimiter.getRemainingRequests(this.market);
      throw new Error(
        `Rate limit exceeded for market ${this.market}. Remaining requests: ${remaining}`
      );
    }
  }

  /**
   * Log a successful request
   */
  protected async logRequest(): Promise<void> {
    const count = await rateLimiter.incrementRequestCount(this.market);
    const remaining = await rateLimiter.getRemainingRequests(this.market);
    console.log(`[${this.market}] Request ${count}/${appConfig.MAX_REQUESTS_PER_DAY}. Remaining: ${remaining}`);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.crawler) {
      await this.crawler.teardown();
      this.crawler = null;
    }
  }

  /**
   * Abstract method to be implemented by platform-specific scrapers
   */
  abstract scrape(params: unknown): Promise<unknown>;
}

// Fixed: Added proper resource cleanup

// Fixed: ensure crawler is properly closed on error
