import * as Sentry from "@sentry/node";
import { appConfig } from "../config/index.js";

let initialized = false;

export function initSentry() {
  if (initialized || !appConfig.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: appConfig.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1, // 10% of transactions
    integrations: [
      // Add custom integrations here
    ],
  });

  initialized = true;
  console.log("Sentry initialized");
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  if (!initialized) {
    console.error("Sentry not initialized, logging error:", error);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  if (!initialized) {
    console.log(`[${level}]`, message);
    return;
  }

  Sentry.captureMessage(message, level);
}

export { Sentry };
