/**
 * API key authentication manager for the Hudu API
 */

import type { ResolvedConfig } from './config.js';

/**
 * Manages API key authentication for the Hudu API.
 * Hudu uses a simple x-api-key header.
 */
export class AuthManager {
  private readonly config: ResolvedConfig;

  constructor(config: ResolvedConfig) {
    this.config = config;
  }

  /**
   * Get the API key for authentication
   */
  getApiKey(): string {
    return this.config.apiKey;
  }

  /**
   * Get the authentication headers
   */
  getAuthHeaders(): Record<string, string> {
    return {
      'x-api-key': this.config.apiKey,
    };
  }
}
