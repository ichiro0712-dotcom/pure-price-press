/**
 * Logger utility for production-safe logging
 * In production, error logs are simplified to avoid exposing internal details
 */

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  /**
   * Log errors - always logs, but with reduced detail in production
   */
  error: (message: string, error?: unknown) => {
    if (isDevelopment) {
      console.error(message, error);
    } else {
      // In production, log message only (no stack traces or sensitive details)
      console.error(message);
    }
  },

  /**
   * Log warnings - only in development
   */
  warn: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(message, ...args);
    }
  },

  /**
   * Log info - only in development
   */
  info: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.info(message, ...args);
    }
  },

  /**
   * Log debug - only in development
   */
  debug: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  },
};
