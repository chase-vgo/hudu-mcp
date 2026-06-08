/**
 * Relations resource operations
 */

import type { HttpClient } from '../http.js';
import type {
  Relation,
  RelationListParams,
  RelationCreateData,
} from '../types/relations.js';

export class RelationsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async list(params?: RelationListParams): Promise<Relation[]> {
    const response = await this.httpClient.request<{ relations: Relation[] }>('/api/v1/relations', {
      params: this.buildParams(params),
    });
    return response.relations;
  }

  async listAll(params?: RelationListParams): Promise<Relation[]> {
    const allItems: Relation[] = [];
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

  async create(data: RelationCreateData): Promise<Relation> {
    const response = await this.httpClient.request<{ relation: Relation }>('/api/v1/relations', {
      method: 'POST',
      body: { relation: data },
    });
    return response.relation;
  }

  async delete(id: number): Promise<void> {
    await this.httpClient.request<void>(`/api/v1/relations/${id}`, {
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
