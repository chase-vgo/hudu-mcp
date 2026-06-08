/**
 * Articles resource operations
 */

import type { HttpClient } from '../http.js';
import type {
  Article,
  ArticleListParams,
  ArticleCreateData,
  ArticleUpdateData,
} from '../types/articles.js';

export class ArticlesResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async list(params?: ArticleListParams): Promise<Article[]> {
    const response = await this.httpClient.request<{ articles: Article[] }>('/api/v1/articles', {
      params: this.buildParams(params),
    });
    return response.articles;
  }

  async listAll(params?: ArticleListParams): Promise<Article[]> {
    const allItems: Article[] = [];
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

  async get(id: number): Promise<Article> {
    const response = await this.httpClient.request<{ article: Article }>(`/api/v1/articles/${id}`);
    return response.article;
  }

  async create(data: ArticleCreateData): Promise<Article> {
    const response = await this.httpClient.request<{ article: Article }>('/api/v1/articles', {
      method: 'POST',
      body: { article: data },
    });
    return response.article;
  }

  async update(id: number, data: ArticleUpdateData): Promise<Article> {
    const response = await this.httpClient.request<{ article: Article }>(`/api/v1/articles/${id}`, {
      method: 'PUT',
      body: { article: data },
    });
    return response.article;
  }

  async delete(id: number): Promise<void> {
    await this.httpClient.request<void>(`/api/v1/articles/${id}`, {
      method: 'DELETE',
    });
  }

  async archive(id: number): Promise<void> {
    await this.httpClient.request<void>(`/api/v1/articles/${id}/archive`, {
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
