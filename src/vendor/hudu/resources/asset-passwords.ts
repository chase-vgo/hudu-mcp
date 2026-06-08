/**
 * Asset Passwords resource operations
 */

import type { HttpClient } from '../http.js';
import type {
  AssetPassword,
  AssetPasswordListParams,
  AssetPasswordCreateData,
  AssetPasswordUpdateData,
} from '../types/asset-passwords.js';

export class AssetPasswordsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async list(params?: AssetPasswordListParams): Promise<AssetPassword[]> {
    const response = await this.httpClient.request<{ asset_passwords: AssetPassword[] }>('/api/v1/asset_passwords', {
      params: this.buildParams(params),
    });
    return response.asset_passwords;
  }

  async listAll(params?: AssetPasswordListParams): Promise<AssetPassword[]> {
    const allItems: AssetPassword[] = [];
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

  async get(id: number): Promise<AssetPassword> {
    const response = await this.httpClient.request<{ asset_password: AssetPassword }>(`/api/v1/asset_passwords/${id}`);
    return response.asset_password;
  }

  async create(data: AssetPasswordCreateData): Promise<AssetPassword> {
    const response = await this.httpClient.request<{ asset_password: AssetPassword }>('/api/v1/asset_passwords', {
      method: 'POST',
      body: { asset_password: data },
    });
    return response.asset_password;
  }

  async update(id: number, data: AssetPasswordUpdateData): Promise<AssetPassword> {
    const response = await this.httpClient.request<{ asset_password: AssetPassword }>(`/api/v1/asset_passwords/${id}`, {
      method: 'PUT',
      body: { asset_password: data },
    });
    return response.asset_password;
  }

  async delete(id: number): Promise<void> {
    await this.httpClient.request<void>(`/api/v1/asset_passwords/${id}`, {
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
