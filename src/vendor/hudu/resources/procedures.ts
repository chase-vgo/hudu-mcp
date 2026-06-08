/**
 * Procedures resource operations
 */

import type { HttpClient } from '../http.js';
import type {
  Procedure,
  ProcedureListParams,
  ProcedureCreateData,
  ProcedureUpdateData,
} from '../types/procedures.js';

export class ProceduresResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async list(params?: ProcedureListParams): Promise<Procedure[]> {
    const response = await this.httpClient.request<{ procedures: Procedure[] }>('/api/v1/procedures', {
      params: this.buildParams(params),
    });
    return response.procedures;
  }

  async listAll(params?: ProcedureListParams): Promise<Procedure[]> {
    const allItems: Procedure[] = [];
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

  async get(id: number): Promise<Procedure> {
    const response = await this.httpClient.request<{ procedure: Procedure }>(`/api/v1/procedures/${id}`);
    return response.procedure;
  }

  async create(data: ProcedureCreateData): Promise<Procedure> {
    const response = await this.httpClient.request<{ procedure: Procedure }>('/api/v1/procedures', {
      method: 'POST',
      body: { procedure: data },
    });
    return response.procedure;
  }

  async update(id: number, data: ProcedureUpdateData): Promise<Procedure> {
    const response = await this.httpClient.request<{ procedure: Procedure }>(`/api/v1/procedures/${id}`, {
      method: 'PUT',
      body: { procedure: data },
    });
    return response.procedure;
  }

  async delete(id: number): Promise<void> {
    await this.httpClient.request<void>(`/api/v1/procedures/${id}`, {
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
