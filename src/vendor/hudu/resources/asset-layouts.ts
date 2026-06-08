/**
 * Asset Layouts resource operations
 */

import type { HttpClient } from '../http.js';
import type {
  AssetLayout,
  AssetLayoutListParams,
  AssetLayoutCreateData,
  AssetLayoutUpdateData,
} from '../types/asset-layouts.js';

export class AssetLayoutsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async list(params?: AssetLayoutListParams): Promise<AssetLayout[]> {
    const response = await this.httpClient.request<{ asset_layouts: AssetLayout[] }>('/api/v1/asset_layouts', {
      params: this.buildParams(params),
    });
    return response.asset_layouts;
  }

  async listAll(params?: AssetLayoutListParams): Promise<AssetLayout[]> {
    const allItems: AssetLayout[] = [];
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

  async get(id: number): Promise<AssetLayout> {
    const response = await this.httpClient.request<{ asset_layout: AssetLayout }>(`/api/v1/asset_layouts/${id}`);
    return response.asset_layout;
  }

  async create(data: AssetLayoutCreateData): Promise<AssetLayout> {
    const response = await this.httpClient.request<{ asset_layout: AssetLayout }>('/api/v1/asset_layouts', {
      method: 'POST',
      body: { asset_layout: data },
    });
    return response.asset_layout;
  }

  async update(id: number, data: AssetLayoutUpdateData): Promise<AssetLayout> {
    const response = await this.httpClient.request<{ asset_layout: AssetLayout }>(`/api/v1/asset_layouts/${id}`, {
      method: 'PUT',
      body: { asset_layout: data },
    });
    return response.asset_layout;
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
