import { BaseScraper } from "../base-scraper.js";
import { prisma } from "../../lib/db.js";
import type { Locale } from "@prisma/client";
import type {
  TikTokProduct,
  TikTokHashtag,
  TikTokSound,
  TikTokVideo,
  ScraperResult,
} from "./types.js";

interface TikTokScrapeParams {
  type: "products" | "hashtags" | "sounds" | "videos" | "creators";
  params?: Record<string, unknown>;
}

export class TikTokScraper extends BaseScraper {
  constructor(market: string) {
    super(market);
  }

  async scrape(params: TikTokScrapeParams): Promise<ScraperResult<unknown>> {
    const { type } = params;

    switch (type) {
      case "products":
        return this.scrapeProducts();
      case "hashtags":
        return this.scrapeHashtags();
      case "sounds":
        return this.scrapeSounds();
      case "videos":
        return this.scrapeVideos();
      default:
        throw new Error(`Unsupported scrape type: ${type}`);
    }
  }

  /**
   * Scrape TikTok Shop products
   */
  private async scrapeProducts(): Promise<ScraperResult<TikTokProduct>> {
    await this.checkRateLimit();

    console.log(`[TikTok] Starting product scraping for ${this.market}`);

    const products: TikTokProduct[] = [];
    const locale = this.market as Locale;

    // Create ingestion job
    const job = await prisma.dataIngestionJob.create({
      data: {
        type: "products",
        locale,
        status: "running",
        startedAt: new Date(),
      },
    });

    try {
      await this.initializeCrawler({ maxRequestsPerCrawl: 20 });

      if (!this.crawler) {
        throw new Error("Crawler not initialized");
      }

      // Categories to scrape
      const categories = [
        "beauty",
        "fashion",
        "electronics",
        "home",
        "sports",
      ];

      for (const category of categories) {
        await this.logRequest();

        // Add request to crawler
        await this.crawler.addRequests([
          {
            url: `https://www.tiktok.com/shop/category/${category}`,
            label: category,
          },
        ]);
      }

      // Run crawler with handler
      await this.crawler.run(async ({ page, request }) => {
        console.log(`Scraping: ${request.url}`);

        // Wait for products to load
        await page.waitForSelector('[data-e2e="product-card"]', {
          timeout: 30000,
        }).catch(() => {
          console.log("Product cards not found, page might be different");
        });

        // Extract product data
        const pageProducts = await page.evaluate(() => {
          const productCards = document.querySelectorAll('[data-e2e="product-card"]');
          const results: TikTokProduct[] = [];

          productCards.forEach((card) => {
            // Extract product info from DOM
            const titleEl = card.querySelector('[data-e2e="product-title"]');
            const priceEl = card.querySelector('[data-e2e="product-price"]');
            const imageEl = card.querySelector('img');
            const linkEl = card.querySelector('a');

            if (titleEl && priceEl && linkEl) {
              const title = titleEl.textContent?.trim() || "";
              const priceText = priceEl.textContent?.trim() || "0";
              const price = parseFloat(priceText.replace(/[^0-9.]/g, ""));
              const url = linkEl.getAttribute("href") || "";
              const product_id = url.split("/").pop() || "";

              results.push({
                product_id,
                title,
                image_url: imageEl?.getAttribute("src") || undefined,
                price,
                currency: "USD",
                sold_count: 0,
                url: `https://www.tiktok.com${url}`,
              });
            }
          });

          return results;
        });

        products.push(...pageProducts);
        console.log(`Found ${pageProducts.length} products on ${request.url}`);
      });

      // Save to database
      let processed = 0;
      let failed = 0;

      for (const product of products) {
        try {
          await this.saveProduct(product, locale);
          processed++;
        } catch (error) {
          console.error(`Failed to save product ${product.product_id}:`, error);
          failed++;
        }
      }

      // Update job status
      await prisma.dataIngestionJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          itemsProcessed: processed,
          itemsFailed: failed,
          completedAt: new Date(),
        },
      });

      console.log(`[TikTok] Product scraping completed: ${processed} processed, ${failed} failed`);

      return {
        success: true,
        data: products,
        count: products.length,
        timestamp: new Date(),
        market: this.market,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[TikTok] Product scraping failed:`, errorMessage);

      await prisma.dataIngestionJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMessage,
          completedAt: new Date(),
        },
      });

      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Scrape trending hashtags
   */
  private async scrapeHashtags(): Promise<ScraperResult<TikTokHashtag>> {
    await this.checkRateLimit();
    console.log(`[TikTok] Hashtag scraping not yet implemented`);

    return {
      success: true,
      data: [],
      count: 0,
      timestamp: new Date(),
      market: this.market,
    };
  }

  /**
   * Scrape trending sounds
   */
  private async scrapeSounds(): Promise<ScraperResult<TikTokSound>> {
    await this.checkRateLimit();
    console.log(`[TikTok] Sound scraping not yet implemented`);

    return {
      success: true,
      data: [],
      count: 0,
      timestamp: new Date(),
      market: this.market,
    };
  }

  /**
   * Scrape trending videos
   */
  private async scrapeVideos(): Promise<ScraperResult<TikTokVideo>> {
    await this.checkRateLimit();
    console.log(`[TikTok] Video scraping not yet implemented`);

    return {
      success: true,
      data: [],
      count: 0,
      timestamp: new Date(),
      market: this.market,
    };
  }

  /**
   * Save product to database
   */
  private async saveProduct(product: TikTokProduct, locale: Locale) {
    const existing = await prisma.product.findUnique({
      where: { externalId: product.product_id },
    });

    const rank = existing?.currentRank || 0;
    const previousRank = existing?.currentRank || null;
    const rankChange = previousRank ? previousRank - rank : 0;

    await prisma.product.upsert({
      where: { externalId: product.product_id },
      create: {
        externalId: product.product_id,
        locale,
        name: product.title,
        description: product.description,
        imageUrl: product.image_url,
        price: product.price,
        originalPrice: product.original_price,
        currency: product.currency,
        totalSales: product.sold_count,
        totalRevenue: product.price * product.sold_count,
        avgRating: product.rating,
        reviewCount: product.review_count || 0,
        currentRank: rank,
        previousRank,
        rankChange,
        lastUpdatedAt: new Date(),
      },
      update: {
        name: product.title,
        description: product.description,
        imageUrl: product.image_url,
        price: product.price,
        originalPrice: product.original_price,
        totalSales: product.sold_count,
        totalRevenue: product.price * product.sold_count,
        avgRating: product.rating,
        reviewCount: product.review_count || 0,
        lastUpdatedAt: new Date(),
      },
    });
  }
}

// Added support for all product categories
