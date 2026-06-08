/**
 * Folders resource operations
 */

import type { HttpClient } from '../http.js';
import type {
  Folder,
  FolderListParams,
  FolderCreateData,
  FolderUpdateData,
} from '../types/folders.js';

export class FoldersResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async list(params?: FolderListParams): Promise<Folder[]> {
    const response = await this.httpClient.request<{ folders: Folder[] }>('/api/v1/folders', {
      params: this.buildParams(params),
    });
    return response.folders;
  }

  async listAll(params?: FolderListParams): Promise<Folder[]> {
    const allItems: Folder[] = [];
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

  async get(id: number): Promise<Folder> {
    const response = await this.httpClient.request<{ folder: Folder }>(`/api/v1/folders/${id}`);
    return response.folder;
  }

  async create(data: FolderCreateData): Promise<Folder> {
    const response = await this.httpClient.request<{ folder: Folder }>('/api/v1/folders', {
      method: 'POST',
      body: { folder: data },
    });
    return response.folder;
  }

  async update(id: number, data: FolderUpdateData): Promise<Folder> {
    const response = await this.httpClient.request<{ folder: Folder }>(`/api/v1/folders/${id}`, {
      method: 'PUT',
      body: { folder: data },
    });
    return response.folder;
  }

  async delete(id: number): Promise<void> {
    await this.httpClient.request<void>(`/api/v1/folders/${id}`, {
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
