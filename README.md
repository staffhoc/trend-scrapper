# Trend Scraper
#
Multi-platform trend intelligence scraping infrastructure for TikTok, Instagram, Amazon, Alibaba, and more.

## Features

- **Multi-Platform Support**: Scrape trending data from TikTok (with more platforms coming)
- **Distributed Architecture**: Deploy workers across Vercel, Railway, and Fly.io for natural IP rotation
- **Rate Limiting**: Built-in rate limiting to respect platform limits (500 req/day by default)
- **Job Queue**: BullMQ-powered job queue with Redis for reliable background processing
- **Database**: Stores data in Neon PostgreSQL (shared across all workers)
- **Monitoring**: Sentry integration for error tracking
- **Docker Support**: Containerized for easy local development and deployment

## Tech Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend Hosting | Vercel | Free ($0/mo) |
| Database | Neon PostgreSQL | Free ($0/mo) |
| Cache/Queue | Upstash Redis | Free ($0/mo) |
| Worker (US) | Vercel Serverless | Free ($0/mo) |
| Worker (GB) | Railway | Free ($5 credit/mo) |
| Worker (DE) | Fly.io | Free ($0/mo) |
| Monitoring | Sentry | Free ($0/mo) |
| Scraper Framework | Crawlee + Playwright | Free |

**Total Cost: $0/month** (using free tiers)

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Vercel    │      │   Railway   │      │   Fly.io    │
│   (US)      │      │   (GB)      │      │   (DE)      │
│  Worker     │      │  Worker     │      │  Worker     │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Neon Postgres │
                    │  (Shared DB)   │
                    └────────────────┘
                            │
                    ┌───────▼────────┐
                    │ Upstash Redis  │
                    │ (Job Queue)    │
                    └────────────────┘
```

Each worker:
- Runs on a different platform with different IP pools
- Scrapes 500 requests/day for its assigned market
- Writes to the same shared Neon database
- Uses BullMQ jobs via Upstash Redis

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for local development)
- Neon PostgreSQL account
- Upstash Redis account

### Installation

1. Clone the repository:
```bash
cd /home/oyinkuro/projects/trend-scraper
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
REDIS_URL="rediss://default:password@host:6379"
MARKET="US"
MAX_REQUESTS_PER_DAY=500
SENTRY_DSN="" # Optional
```

4. Run database migrations:
```bash
npx prisma migrate deploy
```

5. Install Playwright browsers:
```bash
npx playwright install chromium
```

### Local Development

#### Using Docker Compose (Recommended)

Start all services:
```bash
docker-compose up
```

This starts:
- Redis (local instance for development)
- Worker (processes scrape jobs)

#### Manual Development

Start Redis locally:
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

Run the worker:
```bash
npm run worker
```

Create a manual scrape job:
```bash
npm run dev scrape tiktok products
```

Check queue statistics:
```bash
npm run dev stats
```

## Deployment

### Deploy to Vercel (US Market)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Set environment variables in Vercel dashboard:
```
DATABASE_URL = your_neon_url
REDIS_URL = your_upstash_url
MARKET = US
CRON_SECRET = random_secret_string
```

The cron job at `/api/cron/scrape` will run daily at 2 AM UTC.

### Deploy to Railway (GB Market)

1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login and create project:
```bash
railway login
railway init
```

3. Set environment variables:
```bash
railway variables set DATABASE_URL=your_neon_url
railway variables set REDIS_URL=your_upstash_url
railway variables set MARKET=GB
```

4. Deploy:
```bash
railway up
```

### Deploy to Fly.io (DE Market)

1. Install Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Login and launch:
```bash
fly auth login
fly launch
```

3. Set secrets:
```bash
fly secrets set DATABASE_URL=your_neon_url
fly secrets set REDIS_URL=your_upstash_url
fly secrets set MARKET=DE
```

4. Deploy:
```bash
fly deploy
```

## Project Structure

```
trend-scraper/
├── api/                    # Vercel serverless functions
│   └── cron/
│       └── scrape.ts       # Scheduled scrape trigger
├── prisma/                 # Database schema
│   └── schema.prisma
├── src/
│   ├── config/             # Configuration
│   │   └── index.ts
│   ├── lib/                # Shared utilities
│   │   ├── db.ts           # Prisma client
│   │   ├── redis.ts        # Redis client
│   │   ├── rate-limiter.ts # Rate limiting
│   │   └── sentry.ts       # Error tracking
│   ├── queues/             # Job queue definitions
│   │   └── index.ts
│   ├── scrapers/           # Platform scrapers
│   │   ├── base-scraper.ts
│   │   └── tiktok/
│   │       ├── index.ts
│   │       └── types.ts
│   ├── workers/            # Background workers
│   │   ├── index.ts
│   │   └── scraper-worker.ts
│   └── index.ts            # CLI entry point
├── docker-compose.yml      # Local development
├── Dockerfile              # Container image
├── fly.toml                # Fly.io config
├── railway.toml            # Railway config
└── vercel.json             # Vercel config
```

## Usage

### Scrape TikTok Products

```bash
npm run dev scrape tiktok products
```

### Check Queue Stats

```bash
npm run dev stats
```

### View Logs

```bash
# Local (Docker)
docker-compose logs -f worker

# Vercel
vercel logs

# Railway
railway logs

# Fly.io
fly logs
```

## Rate Limiting

The scraper respects rate limits:
- **500 requests/day** per market (configurable via `MAX_REQUESTS_PER_DAY`)
- **2 concurrent requests** (configurable via `CONCURRENT_REQUESTS`)
- Automatic tracking via Redis
- Resets daily at midnight UTC

Check remaining requests:
```typescript
import { rateLimiter } from "./lib/rate-limiter";

const remaining = await rateLimiter.getRemainingRequests("US");
console.log(`Remaining: ${remaining}`);
```

## Adding New Platforms

1. Create a new scraper in `src/scrapers/`:
```typescript
// src/scrapers/instagram/index.ts
import { BaseScraper } from "../base-scraper.js";

export class InstagramScraper extends BaseScraper {
  async scrape(params: unknown): Promise<unknown> {
    // Implement scraping logic
  }
}
```

2. Update the worker to handle the new platform:
```typescript
// src/workers/scraper-worker.ts
case "instagram": {
  const scraper = new InstagramScraper(market);
  const result = await scraper.scrape({ type, params });
  await scraper.cleanup();
  return result;
}
```

3. Add recurring jobs in `src/queues/index.ts`

## Monitoring

### Sentry

Set `SENTRY_DSN` in environment variables to enable error tracking:
```bash
SENTRY_DSN="https://...@sentry.io/..."
```

Errors are automatically captured and reported to Sentry.

### Queue Monitoring

View queue statistics:
```bash
npm run dev stats
```

Output:
```json
{
  "waiting": 5,
  "active": 2,
  "completed": 1234,
  "failed": 12,
  "delayed": 0,
  "total": 1253
}
```

## Troubleshooting

### Redis Connection Error

Make sure Redis is running:
```bash
docker-compose up redis
```

### Rate Limit Exceeded

Check remaining requests:
```bash
npm run dev stats
```

Reset counter (for testing):
```typescript
await rateLimiter.resetCounter("US");
```

### Playwright Browser Not Found

Install browsers:
```bash
npx playwright install chromium
```

### Database Connection Error

Verify `DATABASE_URL` is correct:
```bash
npx prisma studio
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Roadmap

- [x] TikTok product scraping
- [ ] TikTok hashtag scraping
- [ ] TikTok sound scraping
- [ ] TikTok video scraping
- [ ] Instagram scraping
- [ ] Amazon scraping
- [ ] Alibaba scraping
- [ ] Etsy scraping
- [ ] eBay scraping
- [ ] Facebook scraping
- [ ] Twitch scraping
- [ ] X (Twitter) scraping
- [ ] Web dashboard for monitoring
- [ ] API endpoints for data access
