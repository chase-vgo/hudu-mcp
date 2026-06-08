/**
 * Magic Dash resource operations
 */

import type { HttpClient } from '../http.js';
import type {
  MagicDash,
  MagicDashListParams,
  MagicDashCreateData,
  MagicDashUpdateData,
} from '../types/magic-dash.js';

export class MagicDashResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async list(params?: MagicDashListParams): Promise<MagicDash[]> {
    const response = await this.httpClient.request<{ magic_dash: MagicDash[] }>('/api/v1/magic_dash', {
      params: this.buildParams(params),
    });
    return response.magic_dash;
  }

  async listAll(params?: MagicDashListParams): Promise<MagicDash[]> {
    const allItems: MagicDash[] = [];
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

  async get(id: number): Promise<MagicDash> {
    const response = await this.httpClient.request<{ magic_dash: MagicDash }>(`/api/v1/magic_dash/${id}`);
    return response.magic_dash;
  }

  async create(data: MagicDashCreateData): Promise<MagicDash> {
    const response = await this.httpClient.request<{ magic_dash: MagicDash }>('/api/v1/magic_dash', {
      method: 'POST',
      body: { magic_dash: data },
    });
    return response.magic_dash;
  }

  async update(id: number, data: MagicDashUpdateData): Promise<MagicDash> {
    const response = await this.httpClient.request<{ magic_dash: MagicDash }>(`/api/v1/magic_dash/${id}`, {
      method: 'PUT',
      body: { magic_dash: data },
    });
    return response.magic_dash;
  }

  async delete(id: number): Promise<void> {
    await this.httpClient.request<void>(`/api/v1/magic_dash/${id}`, {
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
