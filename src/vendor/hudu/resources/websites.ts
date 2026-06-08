/**
 * Websites resource operations
 */

import type { HttpClient } from '../http.js';
import type {
  Website,
  WebsiteListParams,
  WebsiteCreateData,
  WebsiteUpdateData,
} from '../types/websites.js';

export class WebsitesResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async list(params?: WebsiteListParams): Promise<Website[]> {
    const response = await this.httpClient.request<{ websites: Website[] }>('/api/v1/websites', {
      params: this.buildParams(params),
    });
    return response.websites;
  }

  async listAll(params?: WebsiteListParams): Promise<Website[]> {
    const allItems: Website[] = [];
    let page = 1;
    const pageSize = params?.page_size ?? 25;

    while (true) {
      const items = await this.list({ ...params, page, page_size: pageSize });
      allItems.push(...items);
      if (items.length < pageSize) break;
      page++;
    }
    return allItems;
  }

  async get(id: number): Promise<Website> {
    const response = await this.httpClient.request<{ website: Website }>(`/api/v1/websites/${id}`);
    return response.website;
  }

  async create(data: WebsiteCreateData): Promise<Website> {
    const response = await this.httpClient.request<{ website: Website }>('/api/v1/websites', {
      method: 'POST',
      body: { website: data },
    });
    return response.website;
  }

  async update(id: number, data: WebsiteUpdateData): Promise<Website> {
    const response = await this.httpClient.request<{ website: Website }>(`/api/v1/websites/${id}`, {
      method: 'PUT',
      body: { website: data },
    });
    return response.website;
  }

  async delete(id: number): Promise<void> {
    await this.httpClient.request<void>(`/api/v1/websites/${id}`, {
      method: 'DELETE',
    });
  }

  private buildParams(params?: object): Record<string, string | number | boolean | undefined> {
    if (!params) return {};
    const result: Record<string, string | number | boolean | undefined> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        result[key] = value as string | number | boolean;
      }
    }
    return result;
  }
}
