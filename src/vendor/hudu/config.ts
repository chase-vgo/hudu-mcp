/**
 * Configuration types and defaults for the Hudu client
 */

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
  throttleThreshold: number;
  retryAfterMs: number;
  maxRetries: number;
}

/**
 * Default rate limit configuration for Hudu
 * Hudu documents 300 req/min
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  enabled: true,
  maxRequests: 300,
  windowMs: 60_000,
  throttleThreshold: 0.8,
  retryAfterMs: 5_000,
  maxRetries: 3,
};

/**
 * Configuration for the Hudu client
 */
export interface HuduConfig {
  /** Base URL for the Hudu instance (e.g., "https://acme.huducloud.com") */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Rate limiting configuration */
  rateLimit?: Partial<RateLimitConfig>;
}

/**
 * Resolved configuration with all defaults applied
 */
export interface ResolvedConfig {
  baseUrl: string;
  apiKey: string;
  rateLimit: RateLimitConfig;
}

/**
 * Resolves a configuration object by applying defaults
 */
export function resolveConfig(config: HuduConfig): ResolvedConfig {
  if (!config.baseUrl) {
    throw new Error('baseUrl is required');
  }
  if (!config.apiKey) {
    throw new Error('apiKey is required');
  }

  return {
    baseUrl: config.baseUrl.replace(/\/$/, ''),
    apiKey: config.apiKey,
    rateLimit: {
      ...DEFAULT_RATE_LIMIT_CONFIG,
      ...config.rateLimit,
    },
  };
}
