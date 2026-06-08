/**
 * HTTP layer for the Hudu API
 */

import type { ResolvedConfig } from './config.js';
import type { AuthManager } from './auth.js';
import type { RateLimiter } from './rate-limiter.js';
import {
  HuduError,
  HuduAuthenticationError,
  HuduForbiddenError,
  HuduNotFoundError,
  HuduValidationError,
  HuduRateLimitError,
  HuduServerError,
} from './errors.js';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export class HttpClient {
  private readonly config: ResolvedConfig;
  private readonly authManager: AuthManager;
  private readonly rateLimiter: RateLimiter;

  constructor(config: ResolvedConfig, authManager: AuthManager, rateLimiter: RateLimiter) {
    this.config = config;
    this.authManager = authManager;
    this.rateLimiter = rateLimiter;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params } = options;

    let url = `${this.config.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.executeRequest<T>(url, method, body);
  }

  async requestUrl<T>(url: string): Promise<T> {
    return this.executeRequest<T>(url, 'GET', undefined);
  }

  private async executeRequest<T>(
    url: string,
    method: string,
    body: unknown,
    retryCount: number = 0
  ): Promise<T> {
    await this.rateLimiter.waitForSlot();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.authManager.getAuthHeaders(),
    };

    this.rateLimiter.recordRequest();

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response, url, method, body, retryCount);
  }

  private async handleResponse<T>(
    response: Response,
    url: string,
    method: string,
    body: unknown,
    retryCount: number
  ): Promise<T> {
    if (response.ok) {
      if (response.status === 204) {
        return {} as T;
      }
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return response.json() as Promise<T>;
      }
      return {} as T;
    }

    const responseText = await response.text();
    let responseBody: unknown;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }

    switch (response.status) {
      case 400:
        if (this.isValidationError(responseBody)) {
          const errors = this.parseValidationErrors(responseBody);
          throw new HuduValidationError('Validation error', errors, responseBody);
        }
        throw new HuduError('Bad request', 400, responseBody);

      case 401:
        throw new HuduAuthenticationError(
          'Authentication failed - invalid API key',
          401,
          responseBody
        );

      case 403:
        throw new HuduForbiddenError('Access forbidden - insufficient permissions', responseBody);

      case 404:
        throw new HuduNotFoundError('Resource not found', responseBody);

      case 422:
        if (this.isValidationError(responseBody)) {
          const errors = this.parseValidationErrors(responseBody);
          throw new HuduValidationError('Validation error', errors, responseBody);
        }
        throw new HuduValidationError('Unprocessable entity', [], responseBody);

      case 429:
        if (this.rateLimiter.shouldRetry(retryCount)) {
          const retryAfterHeader = response.headers.get('Retry-After');
          const delay = this.rateLimiter.parseRetryAfter(retryAfterHeader);
          await this.sleep(delay);
          return this.executeRequest<T>(url, method, body, retryCount + 1);
        }
        throw new HuduRateLimitError(
          'Rate limit exceeded and max retries reached',
          this.config.rateLimit.retryAfterMs,
          responseBody
        );

      default:
        if (response.status >= 500) {
          if (retryCount === 0) {
            await this.sleep(1000);
            return this.executeRequest<T>(url, method, body, 1);
          }
          throw new HuduServerError(
            `Server error: ${response.status} ${response.statusText}`,
            response.status,
            responseBody
          );
        }
        throw new HuduError(
          `Request failed: ${response.status} ${response.statusText}`,
          response.status,
          responseBody
        );
    }
  }

  private isValidationError(responseBody: unknown): boolean {
    if (typeof responseBody === 'object' && responseBody !== null) {
      const body = responseBody as Record<string, unknown>;
      return Array.isArray(body['errors']) || typeof body['error'] === 'object';
    }
    return false;
  }

  private parseValidationErrors(responseBody: unknown): Array<{ field: string; message: string }> {
    if (typeof responseBody === 'object' && responseBody !== null) {
      const body = responseBody as Record<string, unknown>;
      const errors = body['errors'] as unknown;
      if (Array.isArray(errors)) {
        return errors.map((err: unknown) => {
          if (typeof err === 'object' && err !== null) {
            const e = err as Record<string, unknown>;
            return {
              field: String(e['field'] ?? e['property'] ?? 'unknown'),
              message: String(e['message'] ?? e['error'] ?? 'Unknown error'),
            };
          }
          return { field: 'unknown', message: String(err) };
        });
      }
    }
    return [];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
