/**
 * Assets resource operations
 */

import type { HttpClient } from '../http.js';
import { HuduNotFoundError } from '../errors.js';
import type {
  Asset,
  AssetListParams,
  AssetCreateData,
  AssetUpdateData,
} from '../types/assets.js';

// NOTE: Hudu nests single-asset operations under the owning company —
// /api/v1/companies/{company_id}/assets/{id}[/archive]. The only top-level
// asset route is the list endpoint (which supports an `id` filter). The methods
// that mutate a specific asset therefore require the company id. (Upstream
// node-hudu used top-level /api/v1/assets/{id} paths, which Hudu 404s.)
export class AssetsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async list(params?: AssetListParams): Promise<Asset[]> {
    const response = await this.httpClient.request<{ assets: Asset[] }>('/api/v1/assets', {
      params: this.buildParams(params),
    });
    return response.assets;
  }

  async listAll(params?: AssetListParams): Promise<Asset[]> {
    const allItems: Asset[] = [];
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

  // Resolve a single asset via the top-level list endpoint's `id` filter so
  // callers don't need the company id just to read one asset.
  async get(id: number): Promise<Asset> {
    const response = await this.httpClient.request<{ assets: Asset[] }>('/api/v1/assets', {
      params: { id },
    });
    const asset = response.assets?.[0];
    if (!asset) {
      throw new HuduNotFoundError('Resource not found', { id });
    }
    return asset;
  }

  async create(data: AssetCreateData): Promise<Asset> {
    const response = await this.httpClient.request<{ asset: Asset }>(
      `/api/v1/companies/${data.company_id}/assets`,
      {
        method: 'POST',
        body: { asset: this.normalizeAssetBody(data) },
      }
    );
    return response.asset;
  }

  async update(companyId: number, id: number, data: AssetUpdateData): Promise<Asset> {
    const response = await this.httpClient.request<{ asset: Asset }>(
      `/api/v1/companies/${companyId}/assets/${id}`,
      {
        method: 'PUT',
        body: { asset: this.normalizeAssetBody(data) },
      }
    );
    return response.asset;
  }

  // Hudu requires `custom_fields` to be an array of objects ("use [ ] not { }").
  // Accept the friendlier single-object form and wrap it so callers (and LLMs)
  // don't have to know the quirk.
  private normalizeAssetBody(data: AssetCreateData | AssetUpdateData): Record<string, unknown> {
    const body: Record<string, unknown> = { ...data };
    const cf = body.custom_fields;
    if (cf && typeof cf === 'object' && !Array.isArray(cf)) {
      body.custom_fields = [cf];
    }
    return body;
  }

  async delete(companyId: number, id: number): Promise<void> {
    await this.httpClient.request<void>(`/api/v1/companies/${companyId}/assets/${id}`, {
      method: 'DELETE',
    });
  }

  async archive(companyId: number, id: number): Promise<void> {
    await this.httpClient.request<void>(`/api/v1/companies/${companyId}/assets/${id}/archive`, {
      method: 'PUT',
    });
  }

  async unarchive(companyId: number, id: number): Promise<void> {
    await this.httpClient.request<void>(`/api/v1/companies/${companyId}/assets/${id}/unarchive`, {
      method: 'PUT',
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
