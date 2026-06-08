/**
 * Companies resource operations
 */

import type { HttpClient } from '../http.js';
import type {
  Company,
  CompanyListParams,
  CompanyCreateData,
  CompanyUpdateData,
} from '../types/companies.js';

export class CompaniesResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async list(params?: CompanyListParams): Promise<Company[]> {
    const response = await this.httpClient.request<{ companies: Company[] }>('/api/v1/companies', {
      params: this.buildParams(params),
    });
    return response.companies;
  }

  async listAll(params?: CompanyListParams): Promise<Company[]> {
    const allItems: Company[] = [];
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

  async get(id: number): Promise<Company> {
    const response = await this.httpClient.request<{ company: Company }>(`/api/v1/companies/${id}`);
    return response.company;
  }

  async create(data: CompanyCreateData): Promise<Company> {
    const response = await this.httpClient.request<{ company: Company }>('/api/v1/companies', {
      method: 'POST',
      body: { company: data },
    });
    return response.company;
  }

  async update(id: number, data: CompanyUpdateData): Promise<Company> {
    const response = await this.httpClient.request<{ company: Company }>(`/api/v1/companies/${id}`, {
      method: 'PUT',
      body: { company: data },
    });
    return response.company;
  }

  async delete(id: number): Promise<void> {
    await this.httpClient.request<void>(`/api/v1/companies/${id}`, {
      method: 'DELETE',
    });
  }

  async archive(id: number): Promise<void> {
    await this.httpClient.request<void>(`/api/v1/companies/${id}/archive`, {
      method: 'PUT',
    });
  }

  async unarchive(id: number): Promise<void> {
    await this.httpClient.request<void>(`/api/v1/companies/${id}/unarchive`, {
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
